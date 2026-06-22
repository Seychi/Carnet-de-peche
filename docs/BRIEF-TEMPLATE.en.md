# Sprint brief template — Fable mode (ultracode + xhigh + workflows)

> Every new sprint brief follows this template (John's decision 2026-06-11, see `CLAUDE.md` §19).
> Goal: a brief that Fable can execute directly in multi-agent orchestration, with no back-and-forth.
>
> ℹ️ English version of `BRIEF-TEMPLATE.md`. The French original remains the source of truth referenced by `CLAUDE.md` §19 and the existing (French) briefs.

---

## Why this format

Fable in `ultracode` mode + `xhigh` effort splits the work into **parallel workstreams** handed to agents. A good brief for this mode:

1. **Makes each block self-contained**: an agent must be able to execute a block from the block's text + the file paths it cites alone. No implicit context like "see yesterday's discussion".
2. **Spells out dependencies**: anything with no dependency starts in parallel on day 1. Sequential is the exception, not the rule.
3. **Gives acceptance criteria an agent can verify**: "the 11th post within 24h returns a clean error" ✅ — "the feed feels nice" ❌.
4. **Pre-decides the open questions**: every open choice is either settled in the brief or flagged `⚠️ ASK JOHN FIRST` (the agent stops there, it does not improvise).
5. **Ends with a dedicated verification workstream**: an independent agent that did not write the code re-reads the criteria, runs tests + build, and does a review pass (RLS security, gating regressions, French copy).
6. **Leverages the connectors (see `CLAUDE.md` §20)**: we never code from memory or on frozen assumptions. Each block states which sub-agent / connector to use — **docs-researcher** (Context7) before any external lib, **supabase-guard** (Supabase RO) for anything touching the database, **qa-chrome** for real QA, **deploy-watch** (Vercel+Sentry) after deployment, **`/verif-sprint`** to close out. This is what makes a brief "intelligent": it anchors on the live schema, up-to-date docs, and real logs instead of freezing assumptions that go stale.

---

## Brief structure

```markdown
# Sprint N — Execution brief
## <Short title>

> Written YYYY-MM-DD. Duration: X weeks (target start → end).
> Context: <links to docs/concurrents/, audits, previous RECAP>.
> John's decisions YYYY-MM-DD: <decisions locked for this sprint>.

**Prerequisites before starting** (manual, John): <merges, env vars, blocking QA>.

---

## 🚀 Launch line (for John to copy-paste)

> ultracode — effort xhigh. Run `docs/sprint-N/BRIEF.md`. Start workstreams
> A/B/C in parallel right now, respect the dependencies in the table, and finish
> with the VERIF workstream before handing back to me. Don't push.

---

## 🧠 Connectors & sub-agents (systematic use — see `CLAUDE.md` §20)

> For each workstream, which sub-agent/connector to use and why. Anchor sensitive facts (migration numbers, policies, columns) by READING them before coding.

| When | Sub-agent → connector | Why |
|---|---|---|
| Before any external lib (Next, @supabase/ssr, Tailwind, MapLibre, Stripe SDK…) | **docs-researcher** → Context7 | Version-correct API (no code from memory). |
| Schema / migration / RLS / types | **supabase-guard** → Supabase (RO) | Read the live schema FIRST; migration = numbered file; regen `lib/types.ts`; `get_advisors`. |
| QA of a screen (preview/device) | **qa-chrome** → Claude in Chrome + Playwright | Screenshots, console, network, anti-regression. |
| After deployment | **deploy-watch** → Vercel + Sentry | Zero runtime regression. |
| Close-out | **`/verif-sprint`** | Tests + build + lint + types + independent review + anti-regression. |

## Sprint goal in one sentence

<one sentence, measurable.>

## Workstreams & dependencies

| WS | Block(s) | Duration | Depends on | Parallelizable day 1 |
|----|----------|----------|------------|---------------------|
| A  | Block 0  | 1-2 d | merge X    | ✅ |
| B  | Block 4  | 0.5 d | —          | ✅ |
| C  | Block 1  | 2-3 d | —          | ✅ |
| D  | Blocks 2-3 | 4 d | C (components) | ❌ |
| VERIF | final review | 0.5 d | all | ❌ (always last) |

## Block X — <name>

<2-3 sentences of context: why, and what NOT to touch.>

> **Connectors**: <which sub-agent/connector for this block, and what to verify/anchor by reading before coding>.

### Tasks
1. <task with exact file paths (`app/actions/feed.ts`, `supabase/migrations/0NN_*.sql`)>
2. <…>

### Acceptance criteria
- <observable behavior + how to verify it (command, URL, SQL query)>
- <forbidden regressions, explicit: "map gating intact">

### Guardrails
- ⚠️ ASK JOHN FIRST: <any open decision>
- Do not touch: <files/policies out of scope>

## VERIF workstream (mandatory, independent agent)

1. Run `/verif-sprint` (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + independent cross-review + anti-regression pass). Then **deploy-watch** after deployment.
2. Re-read each acceptance criterion in the brief and tick ✅/❌ with proof.
3. Security pass: new tables → RLS first; no write that bypasses `*_for_viewer`; no committed secret.
4. Copy pass: informal "tu" everywhere, zod messages in French, no misleading product claims.
5. Deliver `docs/sprint-N/RECAP.md`: done / how to test / manual follow-up for John.

## Manual follow-up for John (post-sprint)

- <manual QA, merge → main, deployment, LIVE env vars…>
```

---

## Checklist before publishing a brief

- [ ] Launch line present (with `ultracode` + `xhigh`) — the keywords act per message, they must be in John's prompt.
- [ ] Each block is self-contained (file paths, no implicit context).
- [ ] The workstreams table maximizes day-1 parallelism.
- [ ] Each acceptance criterion is agent-verifiable (command / URL / query).
- [ ] Every open decision is settled or flagged `⚠️ ASK JOHN FIRST`.
- [ ] VERIF workstream present and last (runs `/verif-sprint`).
- [ ] **Connectors wired**: a "Connectors & sub-agents" section up top + one `> **Connectors**` line per block (see `CLAUDE.md` §20).
- [ ] Sensitive facts (migration numbers, policies, columns) **anchored via supabase-guard** instead of assumed.
- [ ] Invariant reminders: no push without approval, RLS never disabled, migrations = new files, regenerate `lib/types.ts` after a migration.
