# 13 — Content Operations: Consent, Contributors, Copy (starts P0, lands P6)

**Objective:** maintainable content and real people, with consent as a hard gate. This is the longest-lead workstream in the project — start it at P0.

**Owner:** Content/Ops + Hannah (pipeline), Peter (final copy approval).

## Consent pipeline (start immediately — CO-1)

- [ ] CO-1.1 Draft the consent ask: explicit opt-in covering **image, name, role, and profile copy**, with an example of how the portrait appears (use the approved Owned still).
- [ ] CO-1.2 Build the tracker: contributor → contacted / opted-in / photo received / copy drafted / copy approved by the person / approved by Peter. Keep consent records stored durably.
- [ ] CO-1.3 Collect: portraits (usable resolution for the mask treatment), names, roles, 1–2 sentence contribution + ownership blurbs.
- [ ] CO-1.4 Anyone not fully consented by content-freeze ships as an anonymous ember-node (LB-4). Launch never blocks on consent.

## Contributor content model

- [ ] CO-2.1 Structured model (extend donor `content.js` schema): `{ id, name, role, blurb, portrait, consent, seed, pos? }` — people can be added/updated/removed without redesigning the chapter.
- [ ] CO-2.2 **One content source governs everything:** node labels, accessible text, routes, drawers, profiles, footer entries, and Tier-3/fallback metadata. No duplicated strings.
- [ ] CO-2.3 CMS-vs-repository decision is delegated to the tech lead (ADR) — repository JSON/module is acceptable if it stays the single source.

## Live modules rule

- [ ] CO-3.1 **No manually maintained activity numbers anywhere.** A live module (workflow counts, update feeds, etc.) ships only with an automated source + an agreed freshness rule.
- [ ] CO-3.2 Any live module whose source exceeds its freshness window **hides itself automatically**. Test this path.
- [ ] CO-3.3 If no automated source exists by P6: the module doesn't ship. (The superseded Astrid drawer mockup's "128 open workflows / 1.2K builders" is exactly what this rule prohibits faking.)

## Locked copy table (single source for `11`/chapter docs)

| Where | String |
|---|---|
| Mission H1 | We're working to help the open-source AI art ecosystem thrive. |
| Mission sub | Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem. |
| Inspire H | Inspire and empower. |
| Connect H | Connect the ecosystem. |
| Connect sub | Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art. |
| Owned claims | 100% shared · Granted 1% per month · Split between different groups (artists, core engineers, knowledge creators) |
| Final H | We're working to accelerate the second renaissance. |
| Final sub | Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many. |

Inspire supporting copy and all spotlight/card/profile bodies: drafted by Content/Ops, approved by Peter before G4. Mockup captions are **not** copy sources where they differ from the handoff.

## Named owners before launch

- [ ] CO-4.1 Assign a named owner for each: drawer/spotlight copy · activity feeds · contributor profiles · consent records · public links (2RP, Discord, GitHub, banodoco.ai). Record in this file.

## Acceptance
- Every rendered string traces to the single content source; consent flags enforced in code (OW-4.4); owners named; freshness auto-hide demonstrated.
