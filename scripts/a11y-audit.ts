/**
 * Audit accessibilité axe-core — sprint 11 Bloc F.
 *
 * Lance Chromium (via @playwright/test), visite 5 pages publiques clés,
 * injecte axe-core (@axe-core/playwright) et collecte les violations
 * d'impact moderate / serious / critical.
 *
 * Usage : pnpm tsx scripts/a11y-audit.ts
 * Prérequis : `pnpm start` qui tourne sur http://localhost:3000
 * Sortie : JSON sur stdout (entre les marqueurs A11Y_RESULTS_START/END).
 */

import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.A11Y_BASE_URL ?? 'http://localhost:3000';

const PAGES = ['/', '/tarifs', '/spots/pointe-du-raz', '/auth/login', '/carte'];

const IMPACTS = new Set(['moderate', 'serious', 'critical']);

interface ViolationOut {
  page: string;
  ruleId: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodeCount: number;
  firstTarget: string;
  firstHtml: string;
  failureSummary: string;
}

interface PageResult {
  page: string;
  url: string;
  status: 'ok' | 'error';
  httpStatus?: number;
  error?: string;
  violations: ViolationOut[];
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const results: PageResult[] = [];

  for (const path of PAGES) {
    const url = `${BASE_URL}${path}`;
    const page = await context.newPage();
    const result: PageResult = { page: path, url, status: 'ok', violations: [] };

    try {
      const response = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
      result.httpStatus = response?.status();

      // Attendre le réseau au repos (la carte MapLibre met ~2 s à monter).
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
        /* tuiles carto qui streament — on continue après le timeout */
      });
      // Marge supplémentaire pour le rendu client (MapLibre, hydration).
      await page.waitForTimeout(2_500);

      if (result.httpStatus && result.httpStatus >= 400) {
        result.status = 'error';
        result.error = `HTTP ${result.httpStatus}`;
        // On analyse quand même la page rendue (404 custom, etc.) à titre indicatif.
      }

      const axe = await new AxeBuilder({ page }).analyze();

      for (const v of axe.violations) {
        if (!v.impact || !IMPACTS.has(v.impact)) continue;
        const first = v.nodes[0];
        result.violations.push({
          page: path,
          ruleId: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodeCount: v.nodes.length,
          firstTarget: first ? first.target.join(' ') : '',
          firstHtml: first ? first.html.slice(0, 300) : '',
          failureSummary: first?.failureSummary?.slice(0, 500) ?? '',
        });
      }
    } catch (err) {
      result.status = 'error';
      result.error = err instanceof Error ? err.message : String(err);
    } finally {
      await page.close();
    }

    results.push(result);
    console.error(
      `[a11y] ${path} → ${result.status}${result.httpStatus ? ` (HTTP ${result.httpStatus})` : ''}, ${result.violations.length} violation(s) moderate+`,
    );
  }

  await browser.close();

  console.log('A11Y_RESULTS_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('A11Y_RESULTS_END');
}

main().catch((err) => {
  console.error('[a11y] échec fatal :', err);
  process.exit(1);
});
