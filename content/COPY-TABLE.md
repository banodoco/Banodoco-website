# Copy Table — locked strings + placeholder inventory

Source of truth for the strings below is `journey-v6-plan/13-content-ops.md`
(the locked copy table) plus the chapter docs (`07`–`10`) where they mark
additional strings `(locked)`. Where this file and `content.js` ever
disagree, `13-content-ops.md` and the chapter docs win — fix `content.js`,
not this file's transcription note.

## Locked copy (verbatim, copied from `13-content-ops.md`)

| Where | String |
|---|---|
| Mission H1 | We're working to help the open-source AI art ecosystem thrive. |
| Mission sub | Banodoco builds spaces, initiatives and tools for the open source AI art community. |
| Inspire H | Inspire and empower. |
| Connect H | Connect the ecosystem. |
| Connect sub | Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art. |
| Owned claims | 100% shared · Granted 1% per month · Split between different groups (artists, core engineers, knowledge creators) |
| Final H | We're working to accelerate the second renaissance. |
| Final sub | Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many. |

## Additional locked strings (from chapter docs, not in the table above but marked "(locked)")

| Where | String | Source |
|---|---|---|
| Inspire sub (support copy) | Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons. | `07-chapter-inspire.md`, "Copy (locked)". Called out explicitly in the W1-D task brief as approved-in-handoff — included as real copy, not placeholder. |
| Owned H | Owned by the ecosystem | `09-chapter-owned.md`, "Copy and claims (locked, literal, final)" |

Note: `13-content-ops.md` line 39 states "Inspire supporting copy and all
spotlight/card/profile bodies: drafted by Content/Ops, approved by Peter
before G4." The Inspire *support line* itself is nonetheless already given
verbatim in `07-chapter-inspire.md` and in the W1-D task brief, so it ships
as real copy here. Spotlight/card/profile *bodies* are not yet drafted —
those remain placeholder (see inventory below).

## Placeholder inventory

Every row below corresponds to text or a link in `content.js` that contains
the literal string `PLACEHOLDER` (or, for footer links, a `TODO` comment
next to a `'#'` href). Nothing here should be treated as final copy, a real
URL, or a real person.

| Category | Location(s) in `content.js` | What's needed | Who must supply it |
|---|---|---|---|
| Spotlight body copy (Arca Gidan Prize, ArtCompute, 2RP) | `nodes.arca.spotlight.body`, `nodes.artcompute.spotlight.body`, `nodes.tworp.spotlight.body` | Drafted, Peter-approved 2–3 sentence descriptions | Content/Ops (draft) → Peter (approval), per `13-content-ops.md` |
| Spotlight status lines | `nodes.arca.spotlight.status`, `nodes.artcompute.spotlight.status`, `nodes.tworp.spotlight.status` | Real current status — only if backed by an automated source with an agreed freshness rule (CO-3.1–3.3); otherwise this line should not ship at all | Content/Ops + Banodoco (source), Tech Lead (freshness rule) |
| Spotlight links | `nodes.arca.spotlight.link`, `nodes.artcompute.spotlight.link`, `nodes.tworp.spotlight.link` (all `href: '#'`) | Confirmed destination URLs | Banodoco |
| Card body copy (Community, ADOS, Hivemind) | `nodes.community.card.body`, `nodes.ados.card.body`, `nodes.hivemind.card.body` | Drafted, Peter-approved 2-sentence descriptions | Content/Ops (draft) → Peter (approval) |
| Owned pod explanatory sentences | `nodes['pod-shared'].card.body[1]`, `nodes['pod-monthly'].card.body[1]`, `nodes['pod-split'].card.body[1]` | Drafted, Peter-approved explanatory phrasing around the locked claim strings (the claim strings themselves are already locked and NOT placeholder) | Content/Ops (draft) → Peter (approval) |
| Contributor names, roles, blurbs, portraits | `contributors[]` (all 16 entries) | Real name, role, portrait, and 1–2 sentence contribution/ownership blurb, gated on `consent: true` | Consent pipeline (CO-1.1–CO-1.4) — Content/Ops runs it, each contributor personally consents |
| Footer links (banodoco.ai, 2RP, Contact, Discord, GitHub) | `footer.links[]`, `footer.social[]` (all `href: '#'`) | Confirmed destination URLs | Banodoco |
| Footer legal line | `footer.legal` | Legal/Peter-approved final copyright + ownership legal sentence (the ownership facts — 100%, 1%/month, three groups — are already locked; only the surrounding legal sentence needs sign-off) | Legal + Peter |

## Rules this table exists to enforce

- **No manually-invented activity numbers anywhere** — no fake stats, follower
  counts, workflow counts, or submission counts appear in `content.js`.
  (`13-content-ops.md` CO-3.1, and the Astrid drawer mockup's superseded
  "128 open workflows / 1.2K builders" is the named example of what not to do.)
- **No live modules** ship in this package — every dynamic-looking field
  (status lines) is explicit placeholder text, not a wired data source.
- **Every placeholder is greppable**: `grep -rn PLACEHOLDER journey-v6/content/`
  finds all of it. Footer/spotlight/card link placeholders that use `'#'`
  hrefs are additionally marked with an adjacent `TODO(Banodoco):` comment.
- **Consent is a hard gate**: no contributor entry has `consent: true`, so
  every one currently renders as the anonymous ember-node fallback per
  `09-chapter-owned.md` OW-4.4. Nothing here pre-empts that gate.
