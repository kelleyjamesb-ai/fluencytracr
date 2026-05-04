import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { postIngest } from "./fluencyClient.js";

describe("postIngest", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env.FLUENCYTRACR_BASE_URL = "http://example.test";
    process.env.FLUENCYTRACR_DEV_HEADERS = "true";
  });

  afterEach(() => {
    process.env = { ...orig };
    vi.unstubAllGlobals();
  });

  it("POSTs ingest with idempotency and org headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ receipt_id: "r1" }), { status: 202 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = await postIngest(
      "org-1",
      {
        events: [{ x: 1 }],
        idempotencyKey: "idem-1",
        schemaVersion: "0.1"
      },
      fetchMock as typeof fetch
    );
    expect(body).toEqual({ receipt_id: "r1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/api/ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-1",
          "X-FluencyTracr-Schema-Version": "0.1",
          "x-org-id": "org-1"
        })
      })
    );
  });
});
