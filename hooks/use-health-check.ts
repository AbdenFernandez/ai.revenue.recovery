"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { healthResponseSchema, type HealthResponse } from "@/schemas/health";

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

export function useHealthCheck(autoFetch = false) {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestSequenceRef.current;

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/health", {
        signal: controller.signal,
      });
      const json: unknown = await response.json();

      if (requestId !== requestSequenceRef.current) {
        return;
      }

      if (!response.ok) {
        setState({
          status: "error",
          message: "Health check request failed.",
        });
        return;
      }

      const parsed = healthResponseSchema.safeParse(json);

      if (!parsed.success) {
        setState({
          status: "error",
          message: "Invalid health check response.",
        });
        return;
      }

      setState({ status: "success", data: parsed.data });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setState({
        status: "error",
        message: "Unable to reach health endpoint.",
      });
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchHealth();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [autoFetch, fetchHealth]);

  return { state, fetchHealth };
}
