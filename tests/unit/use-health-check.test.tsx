import { describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useHealthCheck } from "@/hooks/use-health-check";

describe("useHealthCheck", () => {
  it("ignores stale responses when requests overlap", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({
                    status: "ok",
                    service: "stale",
                    version: "0.0.0",
                    timestamp: new Date().toISOString(),
                  }),
                  { status: 200 },
                ),
              );
            }, 50);
          }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: "ok",
              service: "fresh",
              version: "0.1.0",
              timestamp: new Date().toISOString(),
            }),
            { status: 200 },
          ),
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHealthCheck());

    await act(async () => {
      void result.current.fetchHealth();
      void result.current.fetchHealth();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });

    if (result.current.state.status === "success") {
      expect(result.current.state.data.service).toBe("fresh");
    }

    vi.unstubAllGlobals();
  });
});
