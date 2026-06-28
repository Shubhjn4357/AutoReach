import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { executeSyncCycle } from "../services/sync";
import { getQueuedOperations } from "../services/db";
import { triggerLocalNotification } from "../services/notifications";

interface UseSyncOptions {
  showCustomAlert: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error"
  ) => void;
  refetchLeads: () => Promise<unknown>;
}

export function useSync({ showCustomAlert, refetchLeads }: UseSyncOptions) {
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: queueSize = 0, refetch: refetchQueue } = useSuspenseQuery<number>({
    queryKey: ["queueSize"],
    queryFn: async () => {
      const queue = await getQueuedOperations();
      return queue.length;
    },
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["templates"] }),
      queryClient.invalidateQueries({ queryKey: ["queueSize"] }),
    ]);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await executeSyncCycle();
      setSyncing(false);
      if (result.success) {
        showCustomAlert(
          "Sync Successful",
          `Synced ${result.syncedCount} modifications.`,
          "success"
        );
        await triggerLocalNotification(
          "AutoReach Sync Completed",
          `Successfully synced ${result.syncedCount} offline modifications.`
        );
      } else {
        showCustomAlert("Sync Failed", "Check your backend connection.", "error");
      }
    } catch (err: unknown) {
      setSyncing(false);
      showCustomAlert("Sync Failed", err instanceof Error ? err.message : "An unexpected error occurred.", "error");
    }
    await invalidateAll();
  };

  const onRefresh = async (refetchTemplates: () => Promise<unknown>) => {
    setRefreshing(true);
    await Promise.all([
      refetchLeads(),
      refetchTemplates(),
      refetchQueue(),
    ]);
    setRefreshing(false);
  };

  return {
    syncing,
    refreshing,
    queueSize,
    invalidateAll,
    handleSync,
    onRefresh,
  };
}
