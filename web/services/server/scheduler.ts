import { Queue, Worker } from "bullmq";
import { db } from "../../../shared/dbClient";
import { campaigns, campaignRecipients } from "../../../shared/db";
import { eq, and, lte, or, inArray } from "drizzle-orm";
import { WhatsAppManager } from "../whatsappManager";
import { redisService } from "../redisService";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Handles the actual dispatch of campaign messages to pending recipients.
 * Keeps track of sent/failed status and supports resumed runs (only processing "pending").
 */
async function runCampaignDispatch(campaignId: string, waManager: WhatsAppManager) {
  const campaignList = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  const campaign = campaignList[0];
  if (!campaign) {
    console.log(`[Campaign Dispatch] Campaign ${campaignId} not found.`);
    return;
  }

  // Verify connection status. If offline, throw so BullMQ worker retries (with exponential backoff)
  if (!waManager.isSessionConnected("default")) {
    throw new Error(`WhatsApp node is offline. Retrying campaign ${campaignId} later...`);
  }

  const messageBody = campaign.messageBody || "";

  // Get only pending recipients (supports partial resumes)
  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "pending")
      )
    );

  console.log(`[Campaign Dispatch] Dispatching ${recipients.length} pending recipients for campaign: ${campaign.name}`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    // If WhatsApp drops connection during execution, stop and throw to allow retry later
    if (!waManager.isSessionConnected("default")) {
      throw new Error(`WhatsApp connection lost during dispatch. Halting campaign ${campaignId}.`);
    }

    const chunk = recipients.slice(i, i + BATCH_SIZE);
    
    for (const recipient of chunk) {
      if (!recipient.phone) {
        await db
          .update(campaignRecipients)
          .set({ status: "failed", attemptedAt: Date.now() })
          .where(eq(campaignRecipients.id, recipient.id));
        failCount++;
        continue;
      }

      try {
        const nameToReplace = recipient.name || "Customer";
        const personalizedMsg = messageBody
          .replace(/\[Name\]/gi, nameToReplace)
          .replace(/\[Phone\]/gi, recipient.phone);

        if (campaign.mediaUrl) {
          await waManager.sendImageMessage("default", recipient.phone, campaign.mediaUrl, personalizedMsg);
        } else {
          await waManager.sendTextMessage("default", recipient.phone, personalizedMsg);
        }

        await db
          .update(campaignRecipients)
          .set({ status: "sent", completedAt: Date.now(), attemptedAt: Date.now() })
          .where(eq(campaignRecipients.id, recipient.id));
        successCount++;
      } catch (sendErr) {
        console.error(`[Campaign Dispatch] Failed to send message to ${recipient.phone}:`, sendErr);
        await db
          .update(campaignRecipients)
          .set({ status: "failed", attemptedAt: Date.now() })
          .where(eq(campaignRecipients.id, recipient.id));
        failCount++;
      }
    }

    if (i + BATCH_SIZE < recipients.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Update campaign status to completed if all pending were processed
  await db
    .update(campaigns)
    .set({ status: "completed", finishedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(campaigns.id, campaignId));

  console.log(`[Campaign Dispatch] Campaign completed: ${campaign.name}. Success: ${successCount}, Fail: ${failCount}`);
}

export function startBackgroundScheduler() {
  const waManager = WhatsAppManager.getInstance();
  const redisClient = redisService.getClient();

  let campaignQueue: Queue | null = null;
  let campaignWorker: Worker | null = null;

  // Initialize BullMQ if Redis is active
  if (redisClient) {
    console.log("> Initializing BullMQ campaign-queue with Redis distributed worker.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    campaignQueue = new Queue("campaign-queue", { connection: redisClient as any });

    campaignWorker = new Worker(
      "campaign-queue",
      async (job) => {
        const { campaignId } = job.data;
        console.log(`[BullMQ Worker] Processing campaign job: ${campaignId}`);
        await runCampaignDispatch(campaignId, waManager);
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection: redisClient as any,
        concurrency: 1, // Process one campaign at a time to prevent rate limits
      }
    );

    campaignWorker.on("failed", (job, err) => {
      console.error(`[BullMQ Worker] Campaign job ${job?.id} failed:`, err.message);
    });
  }

  // Background Loop (Checks for due campaigns)
  setInterval(async () => {
    try {
      const now = Date.now();
      const pendingCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, "scheduled"),
            lte(campaigns.scheduledAt, now)
          )
        );

      for (const campaign of pendingCampaigns) {
        console.log(`[Scheduler] Queueing due campaign: ${campaign.name} (${campaign.id})`);
        
        // Mark status as processing to prevent double scheduling
        await db
          .update(campaigns)
          .set({ status: "processing", startedAt: Date.now(), updatedAt: Date.now() })
          .where(eq(campaigns.id, campaign.id));

        if (campaignQueue) {
          // Add to BullMQ with exponential backoff configuration
          await campaignQueue.add(
            "process-campaign",
            { campaignId: campaign.id },
            {
              attempts: 5,
              backoff: {
                type: "exponential",
                delay: 15000, // Wait 15s before first retry
              },
            }
          );
        } else {
          // Redis Offline Fallback: Run campaign directly inside local memory stack
          console.log("[Scheduler] Redis disconnected; executing campaign dispatch via memory fallback.");
          runCampaignDispatch(campaign.id, waManager).catch((err) => {
            console.error(`[Scheduler Fallback] Campaign dispatch error for ${campaign.id}:`, err);
            db.update(campaigns)
              .set({ status: "failed", updatedAt: Date.now() })
              .where(eq(campaigns.id, campaign.id))
              .catch(() => {});
          });
        }
      }
    } catch (loopErr) {
      console.error("[Scheduler] Error in check loop:", loopErr);
    }
  }, 30000);

  // Background Database Cleanup Job (Runs every 12 hours)
  setInterval(async () => {
    try {
      console.log("[Cleanup Job] Running database cleanup...");
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      const oldCampaigns = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(
          and(
            or(eq(campaigns.status, "completed"), eq(campaigns.status, "failed")),
            lte(campaigns.updatedAt, sevenDaysAgo)
          )
        );
      
      if (oldCampaigns.length > 0) {
        const oldIds = oldCampaigns.map(c => c.id);
        console.log(`[Cleanup Job] Deleting ${oldIds.length} old campaigns and their recipients...`);
        
        const chunkSize = 100;
        for (let i = 0; i < oldIds.length; i += chunkSize) {
          const chunk = oldIds.slice(i, i + chunkSize);
          await db.delete(campaignRecipients).where(inArray(campaignRecipients.campaignId, chunk));
          await db.delete(campaigns).where(inArray(campaigns.id, chunk));
        }
        console.log("[Cleanup Job] Cleanup complete.");
      } else {
        console.log("[Cleanup Job] No old campaigns to clean up.");
      }
    } catch (err) {
      console.error("[Cleanup Job] Error during database cleanup:", err);
    }
  }, 12 * 60 * 60 * 1000);
}
