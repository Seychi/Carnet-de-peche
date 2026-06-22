#!/usr/bin/env node
/**
 * PreToolUse guard — Carnet de Pêche
 * Cross-platform (Node), lit le JSON du hook sur stdin.
 *
 *  - DENY  : toute commande git qui stage/commit un secret (.env*, clés Stripe/Supabase, git add -f).
 *  - ASK   : tout `git push` → confirmation manuelle (règle CLAUDE.md §13 : jamais push sans le feu vert de John).
 *
 * Philosophie « fail-open » : si le hook n'arrive pas à parser, il NE bloque PAS (on ne casse jamais le flow).
 */
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let cmd = "";
  try {
    const data = JSON.parse(raw || "{}");
    cmd = data?.tool_input?.command ?? "";
    if (!cmd && data?.tool_input) cmd = JSON.stringify(data.tool_input);
  } catch {
    process.exit(0); // non parsable → on laisse passer
  }

  const emit = (decision, reason) =>
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: decision,
          permissionDecisionReason: reason,
        },
      }),
    );

  const c = cmd.toLowerCase();
  const isGit = /\bgit\b/.test(c);

  // 1) Secrets → interdiction dure
  const stagingEnv = /\bgit\s+(add|commit|stash)\b/.test(c) && /\.env/.test(c);
  const forceAdd = /\bgit\s+add\b[^\n]*\s-f\b/.test(c); // -f bypasse .gitignore
  const secretKey =
    isGit &&
    /(sk_live_|sk_test_|whsec_|service_role|supabase_service_role_key|stripe_secret_key|sb_secret)/.test(c);

  if (stagingEnv || forceAdd || secretKey) {
    emit(
      "deny",
      "🚫 Commande git qui touche un secret (.env / clé / -f). Bloqué par le guard Carnet de Pêche (CLAUDE.md §1 & §11). Retire le fichier sensible du staging, ou demande à John.",
    );
    return process.exit(0);
  }

  // 2) git push → confirmation obligatoire
  if (/\bgit\s+push\b/.test(c)) {
    emit(
      "ask",
      "⚠️ Push détecté. CLAUDE.md §13 : on ne push jamais sans le feu vert de John. Confirme si tu veux vraiment pousser.",
    );
    return process.exit(0);
  }

  process.exit(0); // tout le reste : permission normale
});
