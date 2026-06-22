#!/usr/bin/env node
/**
 * PostToolUse — Carnet de Pêche
 * Lint le fichier .ts/.tsx qui vient d'être modifié et renvoie les erreurs à Claude
 * pour auto-correction immédiate (avant la CI, qui est bloquante depuis le sprint 11.5).
 *
 *  - exit 0 : fichier propre, ou non concerné, ou erreur interne (fail-open).
 *  - exit 2 : ESLint a relevé des problèmes → Claude voit le stderr et corrige.
 *
 * Trop bavard à ton goût ? Retire le bloc PostToolUse de .claude/settings.json.
 */
import { execSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let file = "";
  try {
    file = JSON.parse(raw || "{}")?.tool_input?.file_path ?? "";
  } catch {
    process.exit(0);
  }

  if (!file || !/\.(ts|tsx)$/.test(file)) process.exit(0);
  if (/[\\/](node_modules|\.next|test-results|playwright-report|supabase[\\/]migrations)[\\/]/.test(file))
    process.exit(0);

  try {
    execSync(`pnpm exec eslint "${file}" --max-warnings=0`, { stdio: "pipe", timeout: 60000 });
    process.exit(0); // propre
  } catch (e) {
    const msg = ((e.stdout?.toString() || "") + (e.stderr?.toString() || "")).trim();
    if (!msg) process.exit(0); // eslint absent / souci d'exécution → fail-open
    process.stderr.write(`ESLint — problèmes sur ${file} :\n${msg}\nCorrige-les avant de continuer.`);
    process.exit(2);
  }
});
