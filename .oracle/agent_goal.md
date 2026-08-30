# Agent Goal

[North Star](./northstar.md)

This run advances the North Star by finding and eliminating the most consequential correctness, fragility, coupling, performance, and maintainability risks across the Banodoco website, then simplifying the codebase where evidence shows that doing so improves coherence.

## Objective

Deploy a wide range of independent GPT-5.6 Luna subagents across architecture, UI implementation, state, animation and 3D systems, responsiveness, performance, maintainability, and recurring patterns, complemented by GPT-5.6 Sol whole-system explorations. Synthesize verified findings into one risk-first backlog, then execute the accepted backlog end to end under the Megado protocol with maximally safe parallelism and coherent gated integration.

## Authoritative inputs

- User objective: `/Users/peteromalley/.codex/attachments/6b88aa3d-97b6-439e-b86b-dfc53eef355a/pasted-text-1.txt`
- Immutable source ref and base SHA: `main` at `1fa145fc51e89c8a1788db39aff98e775a576073`
- Repository source, tests, build/deploy documentation, and generated-artifact manifests at that base SHA
- Durable direction: [North Star](./northstar.md)

## Scope and settled decisions

- Inspect the complete first-party runtime, UI, content/state, rendering/animation, responsive/input, tooling/build, validation, and maintainability surfaces. Archived and vendored trees are context only unless live code depends on them.
- Prioritize: (1) correctness, hidden failures, fragility, dangerous coupling, and performance traps; then (2) simplicity, coherence, and elegance.
- Implement every accepted, evidence-backed backlog item that remains within this repository and does not require product-policy invention or unavailable external credentials.
- Preserve intended visuals and behavior unless a finding proves that behavior incorrect or unsafe.
- Build the picture through successive independent Luna exploration waves. Each wave must synthesize gaps and launch targeted follow-up exploration before planning is declared stable.
- Bounded subsystem/pattern exploration and normal implementation model: **GPT-5.6 Luna**, user-selected.
- Whole-system/big-picture exploration and planning model used through checkpoint `e250e4a`: **GPT-5.6 Sol**. On 2026-08-29 the user explicitly authorized a temporary Sol implementation burst for obvious verified defects; this was a model-policy override, not a scope or sync expansion.
- Effective after checkpoint `e250e4a`, exceptional `[XHARD]` work and Oracle judgment/review model: **Grok 4.6**, user-selected. Luna remains the normal bounded exploration/implementation model. After Grok returned HTTP 402 balance exhaustion, the user explicitly authorized **GPT-5.6 Sol as fallback Oracle** with “DO IT”; Grok remains preferred when available. Switching/fallback does not reopen the already-passed Sol-burst checkpoint.
- Work only in `oracle/codebase-improvement-20260829`; do not mutate `main`.

## Non-goals and authority boundaries

- No speculative product redesign, brand/content rewrite, framework migration, or dependency replacement without evidence that it resolves an accepted finding.
- No edits to unrelated archived experiments or vendored libraries.
- Repository mutation, local validation, commits on the isolated branch, and local browser/runtime testing are authorized.
- Pushing, opening a PR, merging, deploying, publishing, changing remote infrastructure, or altering production data are **not authorized** by this run.

## Done criteria

1. Independent Luna explorations cover every named bounded area, and Sol whole-system passes cover cross-cutting architecture and interactions; all cite concrete file/line or runtime evidence, risks, and ranked recommendations.
2. A single deduplicated backlog orders real-risk findings before simplicity/elegance work, records dispositions, dependencies, acceptance criteria, and validation.
3. The plan is revised by Sol until stable, passes the required settled-plan simplification wave and independent pre-execution contract review, and produces a frozen batched tasklist.
4. Every accepted backlog item is implemented, rejected with evidence, or explicitly classified as outside the frozen authority; no accepted in-scope item remains open.
5. Every batch passes focused validation and one independent Sol-orchestrated review with explicit North Star alignment; rework is closed before dependent work begins.
6. Final evidence maps every criterion and accepted item to source/runtime proof and reviewer disposition.
7. The final branch passes the authoritative project checks and a final overall Sol review; generated artifacts are unchanged unless intentionally updated and reviewed.

## Final validation

- `npm ci`
- `npm run check`
- `tools/check.sh --skip-captures`
- `tools/check.sh` when scene-affecting changes require the full capture gate and the documented local server prerequisite can be satisfied
- Focused browser/runtime scenarios derived from changed behavior, recorded under `.oracle/evidence/`
- Clean-worktree and reviewed-path audit against base SHA

## Stop and sync policy

Stop only for a genuine missing authority/external prerequisite, a reproducible unmet criterion with no safe retry, or risk beyond the frozen contract. Commit reviewed batches locally. Do not push, merge, deploy, or promote without fresh user authorization.
