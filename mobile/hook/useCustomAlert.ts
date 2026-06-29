import { useState, useCallback } from "react";
import { AlertButton } from "../components/CustomAlert";

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  buttons?: AlertButton[];
}

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showCustomAlert = useCallback(
    (
      title: string,
      message: string,
      type: "info" | "success" | "warning" | "error" = "info",
      buttons?: AlertButton[]
    ) => {
      setAlertConfig({
        visible: true,
        title,
        message,
        type,
        buttons,
      });
    },
    []
  );

  const hideCustomAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    alertConfig,
    showCustomAlert,
    hideCustomAlert,
    setAlertConfig,
  };
}
