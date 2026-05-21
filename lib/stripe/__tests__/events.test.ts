import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/pricing";

// --- Mock du client service-role (aucune écriture DB réelle) ---
const { fromMock, upsertMock, updateMock, eqMock } = vi.hoisted(() => {
  const upsertMock = vi.fn();
  const eqMock = vi.fn();
  const updateMock = vi.fn((_payload?: unknown) => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ upsert: upsertMock, update: updateMock }));
  return { fromMock, upsertMock, updateMock, eqMock };
});

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

import {
  handleSubscriptionUpsert,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleCheckoutCompleted,
  handleTrialWillEnd,
} from "@/lib/stripe/events";

beforeEach(() => {
  vi.clearAllMocks();
  upsertMock.mockResolvedValue({ error: null });
  eqMock.mockResolvedValue({ error: null });
});

// Fabrique une Subscription Stripe minimale pour les tests.
function makeSub(overrides: {
  priceId?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: number | null;
  userId?: string | undefined;
  subId?: string;
}): Stripe.Subscription {
  return {
    id: overrides.subId ?? "sub_123",
    customer: "cus_123",
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    trial_end: overrides.trialEnd ?? null,
    latest_invoice: null,
    default_payment_method: null,
    metadata: overrides.userId === undefined ? {} : { user_id: overrides.userId },
    items: {
      data: [
        {
          price: { id: overrides.priceId ?? STRIPE_PRICES.local.monthly },
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe("handleSubscriptionUpsert", () => {
  it("upsert une sub trialing local avec onConflict user_id", async () => {
    await handleSubscriptionUpsert(
      makeSub({ status: "trialing", trialEnd: 1_701_000_000, userId: "user-1" })
    );
    expect(fromMock).toHaveBeenCalledWith("subscriptions");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({
      user_id: "user-1",
      plan: "local",
      status: "trialing",
      stripe_subscription_id: "sub_123",
      cancel_at_period_end: false,
    });
    expect(payload.trial_end).toBe(new Date(1_701_000_000 * 1000).toISOString());
    expect(payload.current_period_end).toBe(new Date(1_702_592_000 * 1000).toISOString());
    expect(opts).toEqual({ onConflict: "user_id" });
  });

  it("upsert une sub active", async () => {
    await handleSubscriptionUpsert(makeSub({ status: "active", userId: "user-2" }));
    expect(upsertMock.mock.calls[0][0]).toMatchObject({ status: "active", plan: "local" });
  });

  it("préserve cancel_at_period_end=true", async () => {
    await handleSubscriptionUpsert(
      makeSub({ status: "active", cancelAtPeriodEnd: true, userId: "user-3" })
    );
    expect(upsertMock.mock.calls[0][0]).toMatchObject({ cancel_at_period_end: true });
  });

  it("mappe le price itinérant → plan itinerant", async () => {
    await handleSubscriptionUpsert(
      makeSub({ priceId: STRIPE_PRICES.itinerant.annual, userId: "user-4" })
    );
    expect(upsertMock.mock.calls[0][0]).toMatchObject({ plan: "itinerant" });
  });

  it("ignore une sub au price inconnu (pas d'écriture)", async () => {
    await handleSubscriptionUpsert(makeSub({ priceId: "price_inconnu", userId: "user-5" }));
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("ignore une sub sans metadata.user_id (pas d'écriture)", async () => {
    await handleSubscriptionUpsert(makeSub({ userId: undefined }));
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("est idempotent : 2 appels du même event = upsert onConflict user_id (pas de doublon)", async () => {
    const sub = makeSub({ status: "active", userId: "user-6" });
    await handleSubscriptionUpsert(sub);
    await handleSubscriptionUpsert(sub);
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[0][1]).toEqual({ onConflict: "user_id" });
    expect(upsertMock.mock.calls[1][1]).toEqual({ onConflict: "user_id" });
    // Même user_id → même ligne (PK), donc pas de duplication possible côté DB.
    expect(upsertMock.mock.calls[0][0].user_id).toBe("user-6");
    expect(upsertMock.mock.calls[1][0].user_id).toBe("user-6");
  });

  it("propage l'erreur d'upsert (→ 500 → retry Stripe)", async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(
      handleSubscriptionUpsert(makeSub({ userId: "user-7" }))
    ).rejects.toBeTruthy();
  });
});

describe("handleSubscriptionDeleted", () => {
  it("downgrade vers discovery en ciblant stripe_subscription_id", async () => {
    await handleSubscriptionDeleted(makeSub({ subId: "sub_del" }));
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      plan: "discovery",
      status: "canceled",
      stripe_subscription_id: null,
    });
    expect(eqMock).toHaveBeenCalledWith("stripe_subscription_id", "sub_del");
  });
});

describe("handleInvoicePaymentFailed", () => {
  function makeInvoice(subId: string | null): Stripe.Invoice {
    return {
      id: "in_123",
      parent: subId ? { subscription_details: { subscription: subId } } : null,
    } as unknown as Stripe.Invoice;
  }

  it("tag la sub en past_due sans toucher au plan", async () => {
    await handleInvoicePaymentFailed(makeInvoice("sub_pd"));
    expect(updateMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: "past_due" })
    );
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty("plan");
    expect(eqMock).toHaveBeenCalledWith("stripe_subscription_id", "sub_pd");
  });

  it("ne fait rien si l'invoice n'a pas de subscription liée", async () => {
    await handleInvoicePaymentFailed(makeInvoice(null));
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("handlers loggeurs (pas d'écriture DB)", () => {
  it("handleCheckoutCompleted ne touche pas la DB", async () => {
    await handleCheckoutCompleted({
      id: "cs_1",
      metadata: { user_id: "u" },
      subscription: "sub_1",
    } as unknown as Stripe.Checkout.Session);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("handleTrialWillEnd ne touche pas la DB", async () => {
    await handleTrialWillEnd(makeSub({ userId: "u" }));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("handleInvoicePaymentSucceeded ne touche pas la DB", async () => {
    await handleInvoicePaymentSucceeded({ id: "in_ok" } as unknown as Stripe.Invoice);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
