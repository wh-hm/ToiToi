"use client";

import { useEffect } from "react";
import { ToiToiNotification } from "@/components/Toast";

export function FlashMessageListener() {
  useEffect(() => {
    const message = sessionStorage.getItem("flash_message");
    if (message) {
      ToiToiNotification.error(message);
      sessionStorage.removeItem("flash_message"); // 1回出したら消す
    }
  }, []);

  return null;
}