"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/lib/hooks/use-toast";

type Input = {
  error?: string | null;
  success?: string | null;
  errorTitle?: string;
  successTitle?: string;
};

export function useFeedbackToast({
  error,
  success,
  errorTitle = "Action failed",
  successTitle = "Action success",
}: Input) {
  const toast = useToast();
  const previousErrorRef = useRef<string | null>(null);
  const previousSuccessRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      previousErrorRef.current = null;
      return;
    }
    if (previousErrorRef.current === error) {
      return;
    }
    previousErrorRef.current = error;
    toast.error({
      title: errorTitle,
      message: error,
    });
  }, [error, errorTitle, toast]);

  useEffect(() => {
    if (!success) {
      previousSuccessRef.current = null;
      return;
    }
    if (previousSuccessRef.current === success) {
      return;
    }
    previousSuccessRef.current = success;
    toast.success({
      title: successTitle,
      message: success,
    });
  }, [success, successTitle, toast]);
}
