import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock du client Stripe (signature) + des handlers ---
const { constructEvent, handlerMocks } = vi.hoisted(() => {
  const constructEvent = vi.fn();
  const handlerMocks = {
    handleCheckoutCompleted: vi.fn(),
    handleSubscriptionUpsert: vi.fn(),
    handleSubscriptionDeleted: vi.fn(),
    handleTrialWillEnd: vi.fn(),
    handleInvoicePaymentSucceeded: vi.fn(),
    handleInvoicePaymentFailed: vi.fn(),
  };
  return { constructEvent, handlerMocks };
});

vi.mock("@/lib/stripe/client", () => ({
  stripe: { webhooks: { constructEvent } },
  STRIPE_WEBHOOK_SECRET: "whsec_test",
}));

vi.mock("@/lib/stripe/events", () => handlerMocks);

import { POST, GET } from "@/app/api/stripe/webhook/route";

function makeRequest(body: string, signature?: string) {
  const headers = new Headers();
  if (signature !== undefined) headers.set("stripe-signature", signature);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/stripe/webhook", () => {
  it("400 si l'en-tête stripe-signature est absent", async () => {
    const res = await POST(makeRequest("{}") as never);
    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("400 si la signature est invalide", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest("{}", "t=1,v1=bad") as never);
    expect(res.status).toBe(400);
  });

  it("200 + dispatch vers handleSubscriptionUpsert sur subscription.created", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "customer.subscription.created",
      data: { object: { id: "sub_1" } },
    });
    const res = await POST(makeRequest("{}", "sig") as never);
    expect(res.status).toBe(200);
    expect(handlerMocks.handleSubscriptionUpsert).toHaveBeenCalledTimes(1);
    // created porte le flag isCreation (déclenche l'email trial start)
    expect(handlerMocks.handleSubscriptionUpsert).toHaveBeenCalledWith(
      { id: "sub_1" },
      { isCreation: true }
    );
  });

  it("200 + dispatch sans isCreation sur subscription.updated", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1b",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    });
    const res = await POST(makeRequest("{}", "sig") as never);
    expect(res.status).toBe(200);
    expect(handlerMocks.handleSubscriptionUpsert).toHaveBeenCalledWith({ id: "sub_1" });
  });

  it("200 + ignoré pour un event non géré (pas de handler appelé)", async () => {
    constructEvent.mockReturnValue({
      id: "evt_2",
      type: "charge.failed",
      data: { object: {} },
    });
    const res = await POST(makeRequest("{}", "sig") as never);
    expect(res.status).toBe(200);
    expect(handlerMocks.handleSubscriptionUpsert).not.toHaveBeenCalled();
    expect(handlerMocks.handleInvoicePaymentFailed).not.toHaveBeenCalled();
  });

  it("500 si un handler lève (→ Stripe rejoue)", async () => {
    constructEvent.mockReturnValue({
      id: "evt_3",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_x" } },
    });
    handlerMocks.handleSubscriptionDeleted.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest("{}", "sig") as never);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/stripe/webhook", () => {
  it("405 (route POST-only)", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });
});
