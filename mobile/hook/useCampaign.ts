import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { getSecureItem, useAppStore } from "../services/store";
import {
  enqueueWhatsAppMessage,
  updateWhatsAppMessageStatus,
  logSentMessage,
  MessageTemplate,
} from "../services/db";
import { Lead } from "../shared/types";
import { hapticLight, hapticSuccess } from "../services/haptics";

interface UseCampaignOptions {
  showCustomAlert: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error"
  ) => void;
  invalidateAll: () => Promise<void>;
}

export function useCampaign({ showCustomAlert, invalidateAll }: UseCampaignOptions) {
  const store = useAppStore();
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkTemplateModalVisible, setBulkTemplateModalVisible] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customBulkBody, setCustomBulkBody] = useState("");
  const [bulkChannel, setBulkChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [bulkWizardVisible, setBulkWizardVisible] = useState(false);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [campaignImageUri, setCampaignImageUri] = useState<string | null>(null);

  const [waLocalLinked, setWaLocalLinked] = useState(false);
  const [autoPilotActive, setAutoPilotActive] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const isAutoSendingRef = useRef(false);

  // Sync whatsapp linkage status when UI changes
  useEffect(() => {
    (async () => {
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      setWaLocalLinked(isLinked === "true");
    })();
  }, [bulkTemplateModalVisible, bulkWizardVisible]);

  const handlePickCampaignImage = async () => {
    hapticLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCampaignImageUri(result.assets[0].uri);
    }
  };

  const startAutoPilotLoop = async (leads: Lead[], templates: MessageTemplate[]) => {
    const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    const finalImageUri = campaignImageUri;
    setCampaignImageUri(null);

    if (waLocalLinked) {
      showCustomAlert(
        "Campaign Dispatched",
        `Enqueuing ${selectedLeads.length} messages for background dispatch.`,
        "success"
      );

      for (const lead of selectedLeads) {
        if (!lead.phone) continue;

        let messageText = customBulkBody;
        if (selectedTemplateId) {
          const temp = templates.find((t) => t.id === selectedTemplateId);
          if (temp) messageText = temp.body;
        }

        const personalizedMsg = messageText
          .replace(/\[Name\]/gi, lead.name)
          .replace(/\[Value\]/gi, "");

        await enqueueWhatsAppMessage(lead.phone, personalizedMsg, finalImageUri || undefined);
      }

      setBulkWizardVisible(false);
      setIsBulkMode(false);
      setSelectedLeadIds([]);
      await invalidateAll();
      return;
    }

    setIsAutoSending(true);
    isAutoSendingRef.current = true;
    setCurrentBulkIndex(0);

    const token = await getSecureItem("auth_token");
    const apiUrl = store.apiUrl;

    for (let i = 0; i < selectedLeads.length; i++) {
      if (!isAutoSendingRef.current) break;

      const currentLead = selectedLeads[i];
      if (!currentLead.phone) {
        setCurrentBulkIndex(i + 1);
        continue;
      }

      let messageText = customBulkBody;
      if (selectedTemplateId) {
        const temp = templates.find((t) => t.id === selectedTemplateId);
        if (temp) messageText = temp.body;
      }

      const personalizedMsg = messageText
        .replace(/\[Name\]/gi, currentLead.name)
        .replace(/\[Value\]/gi, "");

      // 1. Enqueue in SQLite whatsapp_outbox as PENDING
      const queueId = await enqueueWhatsAppMessage(currentLead.phone, personalizedMsg, finalImageUri || undefined);

      // Human pacing delay (1.5s)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!isAutoSendingRef.current) break;

      // 2. Dispatch real HTTP POST request to API if authenticated
      if (token) {
        try {
          await updateWhatsAppMessageStatus(queueId, "PROCESSING");
          const cleanPhone = currentLead.phone.replace(/[^0-9]/g, "");
          const response = await fetch(`${apiUrl}/api/whatsapp/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              phone: cleanPhone,
              text: personalizedMsg,
            }),
          });

          if (response.ok) {
            await updateWhatsAppMessageStatus(queueId, "SENT");
            await logSentMessage(bulkChannel, currentLead.phone, "LOCAL_GATEWAY_AUTO");
          } else {
            const errText = await response.text().catch(() => "Gateway Response Fail");
            await updateWhatsAppMessageStatus(queueId, "FAILED", errText);
            await logSentMessage(bulkChannel, currentLead.phone, "LOCAL_GATEWAY_FAILED");
          }
        } catch (err: any) {
          console.warn("Foreground gateway send failed:", err);
          await updateWhatsAppMessageStatus(queueId, "FAILED", err.message || "Network request failed");
          await logSentMessage(bulkChannel, currentLead.phone, "LOCAL_GATEWAY_FAILED");
        }
      } else {
        await updateWhatsAppMessageStatus(queueId, "FAILED", "Auth token not found");
      }

      setCurrentBulkIndex(i + 1);
    }
    setIsAutoSending(false);
    isAutoSendingRef.current = false;
    hapticSuccess();
  };

  const handleBulkSendNext = async (leads: Lead[], templates: MessageTemplate[]) => {
    const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    if (currentBulkIndex >= selectedLeads.length) {
      setBulkWizardVisible(false);
      setIsBulkMode(false);
      setSelectedLeadIds([]);
      showCustomAlert(
        "Campaign Completed",
        "Sequential messaging dispatch finished.",
        "success"
      );
      return;
    }

    const lead = selectedLeads[currentBulkIndex];
    if (!lead.phone) {
      setCurrentBulkIndex((prev) => prev + 1);
      return;
    }

    let messageText = customBulkBody;
    if (selectedTemplateId) {
      const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
      if (activeTemplate) messageText = activeTemplate.body;
    }

    const personalizedMsg = messageText
      .replace(/\[Name\]/gi, lead.name)
      .replace(/\[Value\]/gi, "");

    const encodedText = encodeURIComponent(personalizedMsg);
    let url = "";
    if (bulkChannel === "whatsapp") {
      const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
      url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    } else {
      const separator = Platform.OS === "ios" ? "&" : "?";
      url = `sms:${lead.phone}${separator}body=${encodedText}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        await logSentMessage(bulkChannel, lead.phone, "BULK_DIRECT_OPEN");
      }
    } catch (err) {
      console.warn("Linking open error", err);
    }

    setCurrentBulkIndex((prev) => prev + 1);
  };

  const handleBulkSkip = () => {
    setCurrentBulkIndex((prev) => prev + 1);
  };

  const cancelCampaign = () => {
    isAutoSendingRef.current = false;
    setIsAutoSending(false);
    setBulkWizardVisible(false);
    setIsBulkMode(false);
    setSelectedLeadIds([]);
  };

  return {
    isBulkMode,
    setIsBulkMode,
    selectedLeadIds,
    setSelectedLeadIds,
    bulkTemplateModalVisible,
    setBulkTemplateModalVisible,
    selectedTemplateId,
    setSelectedTemplateId,
    customBulkBody,
    setCustomBulkBody,
    bulkChannel,
    setBulkChannel,
    bulkWizardVisible,
    setBulkWizardVisible,
    currentBulkIndex,
    setCurrentBulkIndex,
    campaignImageUri,
    setCampaignImageUri,
    waLocalLinked,
    setWaLocalLinked,
    autoPilotActive,
    setAutoPilotActive,
    isAutoSending,
    isAutoSendingRef,
    handlePickCampaignImage,
    startAutoPilotLoop,
    handleBulkSendNext,
    handleBulkSkip,
    cancelCampaign,
  };
}
