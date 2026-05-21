import { describe, it, expect } from "vitest";
import { priceIdToPlan, STRIPE_PRICES } from "@/lib/stripe/pricing";

// Les price_ids TEST sont injectés par vitest.setup.ts :
//   local.monthly   = price_test_local_monthly
//   local.annual    = price_test_local_annual
//   itinerant.*     = price_test_itinerant_{monthly,annual}

describe("priceIdToPlan", () => {
  // --- 4 price_ids valides → bon plan ---
  it("mappe le price local mensuel → local", () => {
    expect(priceIdToPlan(STRIPE_PRICES.local.monthly)).toBe("local");
  });

  it("mappe le price local annuel → local", () => {
    expect(priceIdToPlan(STRIPE_PRICES.local.annual)).toBe("local");
  });

  it("mappe le price itinérant mensuel → itinerant", () => {
    expect(priceIdToPlan(STRIPE_PRICES.itinerant.monthly)).toBe("itinerant");
  });

  it("mappe le price itinérant annuel → itinerant", () => {
    expect(priceIdToPlan(STRIPE_PRICES.itinerant.annual)).toBe("itinerant");
  });

  // --- 4 price_ids invalides → null ---
  it("retourne null pour un price_id inconnu", () => {
    expect(priceIdToPlan("price_inconnu")).toBeNull();
  });

  it("retourne null pour une chaîne vide", () => {
    expect(priceIdToPlan("")).toBeNull();
  });

  it("retourne null pour un price_id presque correct (suffixe)", () => {
    expect(priceIdToPlan(`${STRIPE_PRICES.local.monthly}_X`)).toBeNull();
  });

  it("retourne null pour une valeur arbitraire", () => {
    expect(priceIdToPlan("sub_12345")).toBeNull();
  });
});
