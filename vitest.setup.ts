// Setup Vitest : fournit des variables d'environnement factices AVANT que les
// modules ne soient importés. Indispensable depuis le sprint 9 : lib/stripe/*
// importe lib/env (validation zod au chargement), qui exige les clés Stripe TEST
// hors production. Ces valeurs sont uniquement utilisées par les tests — elles
// déterminent le mapping price_id → plan vérifié dans pricing.test.ts.

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

// Stripe — TEST (les tests tournent hors VERCEL_ENV=production)
process.env.STRIPE_TEST_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_TEST_WEBHOOK_SECRET ??= "whsec_test_dummy";
process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ??= "pk_test_dummy";
process.env.STRIPE_TEST_PRICE_LOCAL_MONTHLY ??= "price_test_local_monthly";
process.env.STRIPE_TEST_PRICE_LOCAL_ANNUAL ??= "price_test_local_annual";
process.env.STRIPE_TEST_PRICE_ITINERANT_MONTHLY ??= "price_test_itinerant_monthly";
process.env.STRIPE_TEST_PRICE_ITINERANT_ANNUAL ??= "price_test_itinerant_annual";
