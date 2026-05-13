/**
 * Script de validation des APIs tierces pour le projet Carnet de Pêche.
 * Coordonnées de test : Douarnenez, Bretagne (lat=48.04, lng=-4.73)
 *
 * Usage : pnpm tsx scripts/check-apis.ts
 */

const LAT = 48.04;
const LNG = -4.73;
const NOW = new Date();
const DATE_STR = NOW.toISOString().split("T")[0];
const END_DATE = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const SEPARATOR = "─".repeat(60);

function log(title: string, data: unknown) {
  console.log(`\n${SEPARATOR}`);
  console.log(`📍 ${title}`);
  console.log(SEPARATOR);
  console.log(JSON.stringify(data, null, 2));
}

function logError(title: string, err: unknown) {
  console.log(`\n${SEPARATOR}`);
  console.log(`❌ ${title}`);
  console.log(SEPARATOR);
  console.error(err);
}

// ─────────────────────────────────────────────────────────
// 1. Open-Meteo Marine
// ─────────────────────────────────────────────────────────
async function checkOpenMeteoMarine() {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set("current", "wave_height,wave_direction,wave_period,sea_surface_temperature");
  url.searchParams.set("hourly", "wave_height,wave_direction,wave_period,sea_surface_temperature");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "Europe/Paris");

  console.log(`\n🌊 URL Open-Meteo Marine : ${url.toString()}`);

  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    log("Open-Meteo Marine — réponse complète", json);

    const hasTides = JSON.stringify(json).toLowerCase().includes("tide");
    console.log(`\n✅ Open-Meteo Marine disponible (HTTP ${res.status})`);
    console.log(`   Fournit des marées ? → ${hasTides ? "OUI" : "NON ❌"}`);
    console.log(`   Champs current disponibles : ${Object.keys(json.current ?? {}).join(", ")}`);
    console.log(`   Champs hourly disponibles  : ${Object.keys(json.hourly ?? {}).join(", ")}`);

    return { ok: true, hasTides, fields: Object.keys(json.hourly ?? {}) };
  } catch (err) {
    logError("Open-Meteo Marine — ERREUR", err);
    return { ok: false, hasTides: false, fields: [] };
  }
}

// ─────────────────────────────────────────────────────────
// 2. Open-Meteo Forecast (météo standard)
// ─────────────────────────────────────────────────────────
async function checkOpenMeteoForecast() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LNG));
  url.searchParams.set("current", "temperature_2m,windspeed_10m,winddirection_10m,pressure_msl,cloudcover,precipitation");
  url.searchParams.set("hourly", "temperature_2m,windspeed_10m,winddirection_10m,pressure_msl,cloudcover,precipitation");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "Europe/Paris");

  console.log(`\n🌤️  URL Open-Meteo Forecast : ${url.toString()}`);

  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    log("Open-Meteo Forecast — réponse complète", json);

    const hasTides = JSON.stringify(json).toLowerCase().includes("tide");
    console.log(`\n✅ Open-Meteo Forecast disponible (HTTP ${res.status})`);
    console.log(`   Fournit des marées ? → ${hasTides ? "OUI" : "NON ❌"}`);
    console.log(`   Champs current disponibles : ${Object.keys(json.current ?? {}).join(", ")}`);
    console.log(`   Champs hourly disponibles  : ${Object.keys(json.hourly ?? {}).join(", ")}`);

    return { ok: true, hasTides, fields: Object.keys(json.hourly ?? {}) };
  } catch (err) {
    logError("Open-Meteo Forecast — ERREUR", err);
    return { ok: false, hasTides: false, fields: [] };
  }
}

// ─────────────────────────────────────────────────────────
// 3. WorldTides (freemium, 100 calls/jour gratuit)
// ─────────────────────────────────────────────────────────
async function checkWorldTides() {
  // Sans clé API valide, on s'attend à un 401 ou 403 — c'est normal.
  // L'objectif est de confirmer que l'endpoint existe et de documenter le format.
  const url = new URL("https://www.worldtides.info/api/v3");
  url.searchParams.set("heights", "");
  url.searchParams.set("lat", String(LAT));
  url.searchParams.set("lon", String(LNG));
  url.searchParams.set("start", String(Math.floor(NOW.getTime() / 1000)));
  url.searchParams.set("length", "86400"); // 24h
  url.searchParams.set("key", "DEMO_KEY_MISSING");

  console.log(`\n🌊 URL WorldTides : ${url.toString()}`);

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    log("WorldTides — réponse brute", json);
    console.log(`\nHTTP status WorldTides : ${res.status}`);

    if (res.status === 200) {
      console.log("✅ WorldTides opérationnel avec la clé fournie");
    } else if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.log("⚠️  WorldTides accessible mais clé manquante/invalide (comportement attendu en test)");
    } else {
      console.log(`⚠️  WorldTides — statut inattendu : ${res.status}`);
    }

    return { ok: res.status < 500, status: res.status, sample: json };
  } catch (err) {
    logError("WorldTides — ERREUR réseau", err);
    return { ok: false, status: 0, sample: null };
  }
}

// ─────────────────────────────────────────────────────────
// 4. StormGlass (10 calls/jour gratuit)
// ─────────────────────────────────────────────────────────
async function checkStormGlass() {
  // Sans clé API valide, on s'attend à un 401 — c'est normal.
  const url = new URL("https://api.stormglass.io/v2/tide/sea-level/point");
  url.searchParams.set("lat", String(LAT));
  url.searchParams.set("lng", String(LNG));
  url.searchParams.set("start", NOW.toISOString());
  url.searchParams.set("end", new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString());

  console.log(`\n🌊 URL StormGlass : ${url.toString()}`);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: "DEMO_KEY_MISSING",
      },
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    log("StormGlass — réponse brute", json);
    console.log(`\nHTTP status StormGlass : ${res.status}`);

    if (res.status === 200) {
      console.log("✅ StormGlass opérationnel avec la clé fournie");
    } else if (res.status === 401 || res.status === 403) {
      console.log("⚠️  StormGlass accessible mais clé manquante/invalide (comportement attendu en test)");
    } else {
      console.log(`⚠️  StormGlass — statut inattendu : ${res.status}`);
    }

    return { ok: res.status < 500, status: res.status, sample: json };
  } catch (err) {
    logError("StormGlass — ERREUR réseau", err);
    return { ok: false, status: 0, sample: null };
  }
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  VALIDATION APIs — Carnet de Pêche");
  console.log(`  Coords test : lat=${LAT}, lng=${LNG} (Douarnenez, Bretagne)`);
  console.log(`  Date        : ${DATE_STR}`);
  console.log("=".repeat(60));

  const marine = await checkOpenMeteoMarine();
  const forecast = await checkOpenMeteoForecast();

  console.log("\n" + "=".repeat(60));
  console.log("  CONFIRMATION MARÉES — Open-Meteo");
  console.log("=".repeat(60));
  console.log(`  Open-Meteo Marine  fournit des marées : ${marine.hasTides ? "✅ OUI" : "❌ NON"}`);
  console.log(`  Open-Meteo Forecast fournit des marées : ${forecast.hasTides ? "✅ OUI" : "❌ NON"}`);
  if (!marine.hasTides && !forecast.hasTides) {
    console.log("\n  ⚠️  CONCLUSION : Open-Meteo ne fournit PAS de prédictions de marées.");
    console.log("     Une API tierce dédiée est nécessaire pour les marées.");
  }

  const worldtides = await checkWorldTides();
  const stormglass = await checkStormGlass();

  console.log("\n" + "=".repeat(60));
  console.log("  RÉSUMÉ FINAL");
  console.log("=".repeat(60));
  console.log(`  Open-Meteo Marine   : ${marine.ok ? "✅" : "❌"} — houle, vagues, SST`);
  console.log(`  Open-Meteo Forecast : ${forecast.ok ? "✅" : "❌"} — vent, température, pression`);
  console.log(`  WorldTides          : HTTP ${worldtides.status} — marées (clé requise)`);
  console.log(`  StormGlass          : HTTP ${stormglass.status} — marées (clé requise)`);
  console.log("\n  → Voir docs/APIS-DECISION.md pour le verdict documenté.");
}

main().catch(console.error);
