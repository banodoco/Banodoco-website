// Content model for the Mushroom Journey v6 — FIVE-chapter build
// (Mission, Inspire, Connect, Owned, Final/epilogue).
//
// Single source of truth for chapter copy, node copy, contributor profiles,
// and the site's outbound links — per journey-v6-plan/13-content-ops.md, CO-2.2:
// "One content source governs everything: node labels, accessible text,
// routes, drawers, profiles, footer entries, and Tier-3/fallback metadata.
// No duplicated strings."
//
// Locked copy (chapter nav labels, headings, subs, Owned claims) is copied
// VERBATIM from journey-v6-plan/13-content-ops.md's locked copy table and
// from the chapter docs (07/08/09/10) where they mark additional strings
// "(locked)". See COPY-TABLE.md in this directory for the source table and
// a full placeholder inventory.
//
// DECISION D10 IS DISCHARGED — Hannah, 2026-08-16. Until this date everything
// outside the locked copy was PLACEHOLDER per DECISIONS.md D10 ("Contributors,
// initiative links, and live stats ship as placeholders for now — anonymous
// ember-nodes, '#' links marked PLACEHOLDER, no live modules"), and every such
// string carried a greppable "PLACEHOLDER" token. There are none left, and
// there is no longer a '#' href anywhere in this file.
//
// THE SOURCE, so the next editor knows where to go rather than inventing:
// Banodoco's own live site, https://www.banodoco.ai/, and the repository it is
// built from, https://github.com/banodoco/Banodoco-website. Node copy below is
// taken from that site's own section copy; the destination URLs are the ones
// its `src/lib/externalLinks.ts` resolves; the contributor roster is its public
// ownership ledger (`src/components/sections/Ownership/data.ts`, rendered at
// https://banodoco.ai/ownership). Where this file paraphrases rather than
// quotes, it is to fit a measure — the claims are theirs.
//
// BANODOCO.AI IS NOT THE WHOLE ORGANISATION, which this file learned the hard
// way: `hivemind` was written up as unbuilt because it appears nowhere on that
// site, its repository or its bundle — and it turned out to have a substantial
// repository of its own (github.com/banodoco/hivemind), which Hannah supplied
// the same day. Before declaring anything here missing, look past the
// marketing site.
//
// ONE THING IS STILL UNBUILT and says so rather than pretending: `tworp`
// (Hannah, 2026-08-16: "2RP is an art and tech publication that aims to
// highlight the best of the ecosystem. COMING SOON"). It carries a "Coming
// soon" status and NO outbound link, which is the honest state — an unbuilt
// thing gets a sentence, not a door. See COPY-TABLE.md.
//
// Equip/PYPE/Arnold/Astrid are deferred out of this active build — their
// donor content is preserved in ./content-archive-deferred.js, not
// imported here. Do not rename this export or any node id: chapters and
// core read this object directly (per donor journey/core/content.js).
//
// NO LIVE MODULES, and this rule SURVIVES D10's discharge (13-content-ops.md
// CO-3.1/CO-3.3): nothing here is a manually-maintained activity number. That
// is why the contributor blurbs below describe a GROUP and never a count, and
// why no node carries a submission/member/grant tally. Real numbers need an
// automated source with an agreed freshness rule, or they do not ship.

export const CONTENT = {
  chapters: {
    mission: {
      nav: 'Mission',
      // Locked verbatim — 13-content-ops.md locked copy table, "Mission H1" / "Mission sub".
      // Also the do-not-touch DOM copy in 06-mission-preservation.md.
      heading: 'We’re working to help the open-source AI art ecosystem thrive.',
      // LOCK OVERRIDE — Hannah, 2026-08-14. The HEADING above is untouched and
      // is still the locked string; the SUB below is not.
      //
      // Direction, transcribed from voice: the hero description "should come
      // down to TWO lines — it is three now and that looks awkward", with a
      // sketch — "Banodoco builds tools, spaces, and initiatives for the
      // open-source AI art ecosystem" — and an explicit invitation to find a
      // better phrasing.
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous sub,
      // locked verbatim by 13-content-ops.md's "Mission sub" row (and named as
      // do-not-touch DOM copy in 06-mission-preservation.md), was:
      //
      //     'Banodoco builds tools, spaces, and shared infrastructure for the
      //      open-source AI art ecosystem.'
      //
      // Hannah owns this copy and overrode that lock knowingly.
      //
      // TWO CHANGES, and only one of them is hers.
      //
      // 1. "shared infrastructure" -> "initiatives" is hers, and it is better
      //    than a synonym swap: the site has three chapters, and "tools,
      //    spaces, and initiatives" names them — Inspire's initiatives,
      //    Connect's spaces, the tools throughout. "shared infrastructure"
      //    named nothing on the page.
      //
      // 2. "for the open-source AI art ecosystem" -> "for open-source AI art"
      //    is the two-line promise, and it is drafted rather than dictated.
      //    Her sketch renders at 2 / 2 / **3** lines (1440x900 / 1280x800 /
      //    375x812) against a 24rem (384px) measure — the desktop ask met, the
      //    phone unchanged at the three she called awkward. Dropping four words
      //    takes the natural line 635.5px -> 520.2px and renders **2 / 2 / 2**:
      //    two lines at every size, with no font step-down and no fallback to
      //    explain. COPY GAVE WAY; THE TYPE SCALE DID NOT — the principle the
      //    Final heading set on 2026-08-07 and the Final sub followed on
      //    2026-08-11, and the first time on this site that it has bought the
      //    promise at ALL THREE sizes rather than desktop-only.
      //
      //    The four words were also the weakest on the page. The H1 directly
      //    above this line ENDS with "open-source AI art ecosystem thrive." —
      //    so the sub was repeating its neighbour's closing phrase verbatim,
      //    one line down. "ecosystem" is still the site's word: it survives in
      //    that H1, in the Owned sub and in the Final sub.
      //
      // This string is mirrored in the Tier-1 DOM (`index.html`, the hero's own
      // `<p class="sub">` — Mission's copy is the hero block, not a `.j-block`)
      // and in the Tier-3 twin (`static/index.html`, twice, plus its
      // `<meta name="description">`). All four moved together.
      sub: 'Banodoco builds tools, spaces, and initiatives for open-source AI art.',
    },
    inspire: {
      nav: 'Inspire',
      // LOCK OVERRIDE — Hannah, 2026-08-14: the Inspire heading "becomes
      // 'Inspire the movement'".
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous
      // heading, locked verbatim by 13-content-ops.md's "Inspire H" row, was:
      //
      //     'Inspire and empower.'
      //
      // Hannah owns this copy and overrode that lock knowingly.
      //
      // THE FULL STOP IS KEPT, on exactly the 2026-08-11 Connect precedent and
      // not by transcription. The direction arrived as voice, which cannot
      // carry a trailing period, and she named a TITLE rather than dictating a
      // string — where the 2026-08-05 Final override did dictate its string and
      // so got its unhyphenated "open source" and numeral "2nd" respected. The
      // slot's own retired string closed with a stop, and so do its siblings in
      // that family (Mission's H1, Connect's "Connect the community."), so
      // dropping it would be a second, unasked-for change to the one string she
      // named. Owned's heading below takes the opposite decision for the same
      // reason: ITS retired string carried no stop, so its replacement carries
      // none either. The rule is the slot's own precedent, not a house comma.
      //
      // Line count is unmoved: 1 / 1 / 2 at 1440x900 / 1280x800 / 375x812,
      // which is what 'Inspire and empower.' rendered. Natural width 436.9px ->
      // 455.3px at 1440, inside the measure the block already owned; no CSS.
      heading: 'Inspire the movement.',
      // LOCK OVERRIDE — Hannah, 2026-08-14, same direction. This sub was
      // "approved-in-handoff text" per the W1-D brief and locked by
      // 07-chapter-inspire.md's "Copy (locked)" support line. It is not now.
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous sub was:
      //
      //     'Banodoco helps people push open models beyond their expected
      //      limits through challenges, compute, and rigorous research,
      //      turning breakthrough ideas into a thriving commons.'
      //
      // Her direction, transcribed from voice and explicitly approximate: "We
      // aim to launch and steward initiatives that inspire more people to care
      // about the open-source AI art ecosystem."
      //
      // DRAFTED, not transcribed — she gave the sense and asked for it to be
      // written properly, the same standing she gave the 2026-08-11 Final sub.
      // Two things moved, and both were measured before they were chosen:
      //
      // 1. "We aim to" -> "Banodoco". The register split on this site is
      //    deliberate and visible: HEADINGS speak as "we" (Mission's H1, "We're
      //    working to help…"), SUBS speak as "Banodoco" — all four of them,
      //    including this chapter's neighbours. A first-person sub among three
      //    third-person ones reads as an inconsistency rather than a choice.
      //    The hedge goes with it, and costs nothing it was carrying: the
      //    initiatives are not aspirational — they are the three nodes of this
      //    very chapter (Arca Gidan Prize, ArtCompute, 2RP). What is
      //    aspirational is inspiring people to care, and that survives intact
      //    as the purpose clause.
      //
      // 2. "the open-source AI art ecosystem" -> "open-source AI art", the same
      //    four words the Mission sub above gave up, for the same reason and to
      //    the same effect, and here it is what PAYS for change 1. Measured
      //    against the block's 26rem (416px) measure: her sketch renders
      //    2 / 2 / 4 lines, but the third-person form of her exact sentence
      //    renders 3 / 3 / 4 — at 115 characters its natural line is 850.7px,
      //    against the 832px two lines of this measure can hold. Dropping the
      //    four words takes it to 740.5px and 2 / 2 / 3: two lines at both
      //    desktop sizes, and one line FEWER than her own sketch on a phone.
      //    So the third person is not paid for in layout; it is bought.
      //
      // Every load-bearing term survives in her order: launch/steward ·
      // initiatives · inspire · more people to care · open-source AI art. The
      // echo of the heading's "inspire" is hers and is deliberately kept.
      //
      // 171 characters -> 101. Rendered 4 / 4 / 6 lines -> 2 / 2 / 3.
      sub: 'Banodoco launches and stewards initiatives that inspire more people to care about open-source AI art.',
    },
    connect: {
      nav: 'Connect',
      // Locked verbatim — 13-content-ops.md locked copy table, "Connect H" /
      // "Connect sub". The SUB below is still that locked string, unedited.
      // The HEADING is not:
      //
      // LOCK OVERRIDE — Hannah, 2026-08-11, direction: "change the title to
      // 'Connect the community'".
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous
      // heading, locked verbatim by 13-content-ops.md's "Connect H" row, was:
      //
      //     'Connect the ecosystem.'
      //
      // Hannah owns this copy and overrode that lock knowingly. One word moves
      // — ecosystem -> community — and nothing else about the string does.
      //
      // THE FULL STOP IS KEPT, and that is a judgement, not a transcription.
      // The direction arrived as voice, which cannot carry a trailing period,
      // and she asked for a title change rather than for an exact string (the
      // 2026-08-05 Final override, by contrast, dictated its string verbatim
      // and got its unhyphenated "open source" and numeral "2nd" respected for
      // exactly that reason). The site's short chapter headings all close with
      // a stop — "Inspire and empower." and Mission's H1 — so dropping it here
      // would be a second, unasked-for change to the one string she named.
      //
      // The word swap costs 18px: at 1440 this heading sets 476px as
      // "ecosystem" and 494px as "community", which overran the measure the
      // block used to have and broke a one-line heading in two. See the
      // CONNECT MEASURE block in journey/site.css — the block widened, the
      // type scale did not move.
      heading: 'Connect the community.',
      // Locked string, unedited — but its LINE COUNT is now a promise: two
      // lines, not three (Hannah, 2026-08-11, same direction: "make the
      // Connect the ecosystem one over two lines as well"). That is a layout
      // problem, not a copy one, and not a single character of the locked
      // string was spent on it. Held in journey/site.css by the CONNECT
      // MEASURE block; desktop-only, as the Final sub's is.
      sub: 'Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art.',
    },
    owned: {
      nav: 'Owned',
      // LOCK OVERRIDE — Hannah, 2026-08-14: "the Owned section becomes 'Owned
      // by contributors'".
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous
      // heading, locked verbatim by 09-chapter-owned.md's "Copy and claims
      // (locked, literal, final)" — the locked copy table in 13 carries only
      // the claims line, so this string's lock lived in the chapter doc — was:
      //
      //     'Owned by the ecosystem'
      //
      // Hannah owns this copy and overrode that lock knowingly.
      //
      // NO FULL STOP, and that is the same judgement the Inspire heading above
      // makes in the other direction: the rule is the slot's own precedent, and
      // this slot's retired string carried none. (Final's carries none either;
      // Mission, Inspire and Connect all close with a stop. The site is not
      // uniform on this and never was — the long headings run open, the short
      // ones close.)
      //
      // It also names the section better than the string it replaces. Every
      // interactive thing in this chapter is a CONTRIBUTOR — sixteen faces,
      // sixteen `contributor-N` ids, one card each — and the sub below now says
      // "the people who contribute". The heading was the only part still
      // pointing at an abstraction.
      //
      // Rendered 2 / 1 / 2 lines -> 1 / 1 / 2 (1440x900 / 1280x800 / 375x812):
      // 'Owned by the ecosystem' set 499.4px against a 480px column at 1440 and
      // broke in two by 19px. This one sets 468px and does not. The measure did
      // not move — the copy came in under it.
      heading: 'Owned by contributors',
      // LOCK OVERRIDE — Hannah, 2026-08-05, direction: "in Owned by the
      // ecosystem, turn this stuff below the header into prose subtext like the
      // other sections."
      //
      // PROVENANCE, kept deliberately rather than deleted. Until this date this
      // chapter had no prose `sub`: the three ownership claims were a LIST
      // (`claims: [...]`, rendered by journey/ui.js as `.j-claims`) and were
      // locked verbatim by 13-content-ops.md's "Owned claims" row, annotated
      // here "Do not paraphrase these." Hannah owns this copy and has overridden
      // that lock knowingly. The three claim strings were:
      //
      //     ' 100% shared'                    (primary)
      //     'Granted 1% per month'            (secondary)
      //     'Split between different groups'  (secondary)
      //       detail: 'artists, core engineers, and knowledge creators'
      //
      // The MEANING of all three is preserved intact in the single prose line
      // below — 100% shared, granted 1% per month, split between those exact
      // three groups. The one word added beyond the locked strings is
      // "ownership", which names what the 1% per month actually is; the old
      // list carried that by adjacency to the heading, a run-on sentence does
      // not. Nothing was dropped or softened.
      //
      // The `claims` array itself is GONE, not merely unrendered, so there is
      // one home for this copy and not two. Owned was the ONLY chapter that
      // ever carried one, so journey/ui.js's `.j-claims` renderer and
      // journey/site.css's `.j-claim*` rules went with it rather than staying
      // as an unreachable branch and dead CSS.
      //
      // The claims list was not only copy: each `<li>` fired an Owned colony
      // pulse on hover (ui.js -> chapters/owned/index.js `trigger()`). That
      // behaviour is re-hosted on this prose line — see CHAPTER_SUB_PULSE in
      // journey/ui.js. The whole sentence is now the claim, so it fires the
      // whole-colony wave ('claimPrimary'); the two localized secondary pulses
      // retired with the list they belonged to.
      //
      // SECOND OVERRIDE — Hannah, 2026-08-14. Everything above is the record of
      // the first one and is kept; this is the record of the second, which goes
      // further than it did.
      //
      // Direction, transcribed from voice: copy "along the lines of — 'Banodoco
      // is 100% shared with the people who contribute to the open-source AI art
      // ecosystem — granted 1% per month, between artists, engineers, and
      // knowledge creators.'"
      //
      // The string retired today, which is the one the 2026-08-05 block above
      // describes building, was:
      //
      //     'Banodoco is 100% shared with the people who build it — ownership
      //      granted 1% per month, split between artists, core engineers, and
      //      knowledge creators.'
      //
      // WHAT THIS COSTS THE LOCKED CLAIMS, stated plainly, because it is more
      // than the 2026-08-05 override cost. That override preserved all three
      // claims intact and said so. This one does not:
      //
      //   · "core engineers" -> "engineers". This MOVES a locked claim —
      //     13-content-ops.md's "Owned claims" row names the three groups as
      //     "artists, core engineers, knowledge creators", and core engineers
      //     are a subset of engineers, so the circle is genuinely wider. It is
      //     kept as she said it, and read as deliberate rather than as a
      //     transcription slip, because the sentence's OTHER change moves the
      //     same way: "the people who build it" -> "the people who contribute
      //     to the open-source AI art ecosystem" widens who is included by
      //     exactly the same gesture. Two widenings in one sentence is an
      //     intent, not a slip.
      //   · "ownership" is dropped, and not restored. 2026-08-05 added that
      //     word because "granted 1% per month" had no antecedent in a run-on
      //     sentence. It has one now: the sentence's own subject is the
      //     sharing, so the em-dash clause reads as a reduced relative on the
      //     100% share. Her tightening stands.
      //
      // ONE WORD IS RESTORED AGAINST HER TRANSCRIPT: "split". Voice can carry
      // "granted 1% per month, between artists…" as an ellipsis; print cannot —
      // "between" is left with no verb to hang on, and the reader has to supply
      // "divided". "split" is also one of the locked claim strings ("Split
      // between different groups"), so restoring it repairs the grammar and
      // returns a locked word in the same move, at zero cost to her sense. Same
      // class of judgement as keeping Connect's full stop on 2026-08-11: she
      // gave a direction, not a dictation, and this is the one word where
      // following the transcript exactly would have printed something she did
      // not mean.
      //
      // NOT CHANGED, deliberately: `nodes.pod-split` and `site.legal` below
      // still read "core engineers". The pod cards are not rendered in this
      // build (Owned registers the sixteen `contributor-N` hotspots, not pods)
      // and the legal line is explicitly placeholder pending Legal/Peter
      // sign-off — editing a legal sentence off the back of a voice note about
      // a heading would be worse than the inconsistency. Flagged rather than
      // fixed; it wants Legal's own pass.
      //
      // Rendered 3 / 3 / 5 lines -> 4 / 4 / 5 (1440x900 / 1280x800 / 375x812).
      // No line count was asked for here and none is promised; the sentence
      // grew by 23 characters and took a fourth line at desktop for them. Three
      // lines would need it under ~1248px of natural width and it sets 1290.6.
      sub: 'Banodoco is 100% shared with the people who contribute to the open-source AI art ecosystem — granted 1% per month, split between artists, engineers, and knowledge creators.',
      // ACTIONS — the chapter's copy-level controls (Hannah, 2026-08-07;
      // reduced to one, 2026-08-13).
      //
      // Declared as CONTENT, not as markup, because journey/ui.js must not
      // know which chapter has controls — the same rule the label policy and
      // the popover eligibility already keep. Any chapter that grows an
      // `actions` array gets a row; every chapter that does not is untouched.
      //
      //   kind   'link'   -> a real <a href>      (a destination)
      //   weight 'primary'                        -> the visual weight
      //
      // REMIX IS NO LONGER HERE (Hannah, 2026-08-13): "remove the visible
      // Remix button ... the [crown] light-flash interaction should take over
      // the Remix behaviour ... integrated into the scene rather than exposed
      // as a separate UI control." The re-deal is now the CROWN's own commit —
      // see `hoverZones()` in chapters/owned/index.js, which carries the
      // `action`/`label`/`announce` fields this entry used to. The chapter's
      // `trigger('remixPortraits')` contract is unchanged; only the control
      // that pulls it moved, out of the copy and onto the thing it describes.
      //
      // Order is TAB order and reading order.
      actions: [
        {
          id: 'owned-learn',
          kind: 'link',
          weight: 'primary',
          label: 'Learn more',
          // CONFIRMED 2026-08-16. The donor build guessed https://banodoco.ai
          // and that guess was rejected here for a year as unconfirmed; the
          // real destination is one level deeper. banodoco.ai's own Ownership
          // section links exactly here, under the label "Learn how it works",
          // and the page it opens is the long-form explanation of the very
          // claims this chapter states in three lines — the 1%-per-month
          // mechanism, the four groups, dilution, what happens on an
          // acquisition. Hannah's label "Learn more" is kept: it is her copy,
          // it is the site's own house phrasing for this control, and only the
          // href was ever the open question.
          //
          // RE-POINTED 2026-08-17 (Hannah): the site now carries its OWN
          // ownership page (ownership/), the same explanation and the same
          // ledger mirrored from banodoco.ai/ownership's own sources
          // (Banodoco-website data.ts + ownership.json), dressed in this
          // site's design language. The visitor stays in the world; the
          // page's footer still credits and links the source of record.
          href: './ownership/',
        },
      ],
    },
    final: {
      // Per 10-chapter-final.md: "Not a sixth peer chapter — no nav item, no
      // deep detail state; Owned remains the active nav chapter through the
      // epilogue." nav is set to null on purpose — do NOT render a fifth nav
      // pill from this. Kept here only so this remains the single content
      // source for the epilogue's heading/sub/document-title text.
      nav: null,
      // Locked verbatim — 13-content-ops.md locked copy table, "Final H" / Final sub".
      // The SUB below is still that locked string. The HEADING is not:
      //
      // LOCK OVERRIDE — Hannah, 2026-08-05, direction: change the Final
      // section's h1 to exactly "The open source ecosystem can accelerate a 2nd
      // Renaissance", kept to two lines like the description.
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous heading,
      // locked verbatim by 13-content-ops.md's "Final H" row, was:
      //
      //     'We’re working to accelerate the second renaissance.'
      //
      // Hannah owns this copy and overrode that lock knowingly. Set VERBATIM as
      // she wrote it — note "open source" unhyphenated (the Mission heading uses
      // "open‑source"), "2nd" as a numeral, and "Renaissance" capitalised. Those
      // are her spellings, not typos to normalise; leave them.
      //
      // Two-line wrap is a LAYOUT promise, not a copy one, and is held in
      // journey/site.css by the `.pos-bottomleft` measure — see the FINAL
      // HEADING MEASURE block there before editing either side.
      //
      // The promise is DESKTOP-ONLY as of the 2026-08-07 mobile pass. Two
      // lines is geometrically unreachable at phone widths at the house type
      // scale (the balanced break needs 434px of column; a 375px phone can
      // offer ~320px), and buying it cost a font step-down that flattened the
      // heading/sub hierarchy to 1.31 where every other chapter runs 1.90. So
      // below 480px this heading keeps the house scale and runs to four
      // balanced lines instead. See journey/site.css's FINAL HEADING AT PHONE
      // WIDTHS block and journey-v6-plan/24-mobile-pass.md §Final.
      heading: 'The open source ecosystem can accelerate a 2nd Renaissance',
      // LOCK OVERRIDE — Hannah, 2026-08-11. The sub above was described as
      // "still that locked string" until this date; it is not any more.
      //
      // Direction, transcribed from voice: "something along the lines of — 'a
      // thriving open AI art ecosystem'… a world in which the AI art ecosystem
      // thrives would really be one in which humans and artificial
      // intelligence maximise their collective creative potential. Say
      // something like that, and then make that over two lines instead of
      // three."
      //
      // PROVENANCE, kept deliberately rather than deleted. The previous sub,
      // locked verbatim by 13-content-ops.md's "Final sub" row, was:
      //
      //     'Banodoco exists to help new tools, communities, and ideas spread
      //      — so one thriving ecosystem becomes many.'
      //
      // Hannah owns this copy and overrode that lock knowingly. She gave the
      // SENSE and asked for it to be written properly, so this is a drafted
      // line, not a transcription — the one place in this file where that is
      // true, and the reason her words are quoted in full above.
      //
      // WHAT WAS TIGHTENED, and what was not. Her sentence is a conditional
      // identity: a world where X holds is a world where Y holds. Written out
      // ("A world in which the open AI art ecosystem thrives is one in which
      // humans and artificial intelligence maximise their collective creative
      // potential") that is 147 characters and spends 28 of them on saying
      // "a world in which … is one in which". "When X, Y" is the same claim in
      // one move. Every load-bearing term survives untouched and in her order:
      // open · AI art ecosystem · thrives · humans and artificial intelligence
      // · maximise · their collective creative potential. Note "artificial
      // intelligence" is spelled out where the same sentence abbreviates "AI
      // art" — that contrast is hers and is deliberately kept.
      //
      // The 28 characters are not a style preference; they are the two-line
      // promise. At the shipped font this line needs 448px of column to break
      // in two and the long form needs 544px, and 448px is what leaves the
      // measure enough headroom to survive the fallback font (nothing in this
      // stack is a webfont — see the CONNECT/FINAL SUB MEASURE block in
      // journey/site.css). Copy gave way; the type scale did not move, exactly
      // as it did not for the heading above.
      //
      // Two lines is a DESKTOP promise, on the same terms and for the same
      // reason as the heading's: at 375px the block can offer ~285px of column
      // and this line sets 850px, so two lines is geometrically unreachable
      // without a font step-down that would flatten the hierarchy. It runs to
      // four balanced lines at phone widths instead, under the heading's four.
      sub: 'When the open AI art ecosystem thrives, humans and artificial intelligence maximise their collective creative potential.',
    },
  },

  // Each node names its own chapter (`chapter:`). Added for the navigation
  // redux (Hannah, 2026-08-09): the right-side navigator's site-map panel
  // lists every chapter's nodes, and the chapter⇄node grouping used to exist
  // only as comments here and as registration order in journey.js — neither
  // of which a menu can read. Insertion order within a chapter is narrative
  // order, exactly as it is for hotspot registration.
  nodes: {
    // --- Inspire chapter: three spore-exit spotlights (07-chapter-inspire.md IN-1.2) ---
    arca: {
      chapter: 'inspire',
      // 'Arca Gidan Prize' -> 'Arca Gidan' (Hannah, 2026-08-18: "no need
      // for the prize") — the chip and menu row say the name; the card's
      // own PRIZE eyebrow and the spotlight title still carry the full
      // title where there is room for it. Also the practical cure for the
      // phone-width chip wrapping its icon under a three-word label.
      label: 'Arca Gidan',
      short: 'An open-source AI art competition.',
      spotlight: {
        title: 'Arca Gidan Prize',
        // Both sentences are banodoco.ai's own Arca Gidan section copy, the
        // second verbatim. The site's heading runs "The Arca Gidan Prize is an
        // open source AI art competition" as one line with the name inline;
        // this slot already prints the name as its title, so the heading is
        // set as a statement rather than repeating "Arca Gidan Prize" twice
        // within 40px of itself.
        body: [
          'The Arca Gidan Prize is an open source AI art competition.',
          'We wish to provide a reason for people to push themselves and open models to their limits.',
        ],
        // NOT a live stat and not a status-of-the-programme line (CO-3.1): it
        // names a published, dated artefact — the winners page the site's own
        // section links under the label "2026 Winners". It goes stale on a
        // yearly cadence, in one word, and the link below outlives it.
        status: '2026 winners announced.',
        link: { label: 'Learn more', href: 'https://arcagidan.com/' },
      },
    },
    artcompute: {
      chapter: 'inspire',
      label: 'ArtCompute',
      short: 'Micro-grants for people pushing open models.',
      spotlight: {
        title: 'ArtCompute',
        // First line is banodoco.ai's own ArtCompute card copy, verbatim
        // ("Micro-grants for those pushing open AI models, approved by AI"),
        // recast from a fragment into a sentence with the subject named. The
        // "approved by AI" clause is theirs and is deliberately kept — it is
        // the surprising, specific half of the claim, and dropping it would
        // leave a generic grants programme behind.
        body: [
          'ArtCompute gives micro-grants to those pushing open AI models, approved by AI.',
          'It is practical compute for people whose ambition has outrun their hardware.',
        ],
        link: { label: 'Visit website', href: 'https://artcompute.org/' },
      },
    },
    tworp: {
      chapter: 'inspire',
      label: '2RP',
      short: 'An art and tech publication. Coming soon.',
      spotlight: {
        title: '2RP',
        // Hannah, 2026-08-16, transcribed: "2RP should say that 2RP is an art
        // and tech publication that aims to highlight the best of the
        // ecosystem. COMING SOON." Her sentence is set verbatim; the second
        // line is the ecosystem's own word for what gets highlighted.
        //
        // NO LINK, deliberately, and this is the one place where this file
        // disagrees with banodoco.ai. That site does route /2RP to a live page
        // and links it from its own hero — but the page there is a resources
        // hub (Art / Resources / Briefing), not the publication Hannah is
        // describing, and she has called the publication itself coming soon.
        // A "Read the publication" button that opened something else would be
        // the one genuinely misleading control on the site. If she would
        // rather point at the hub, one line restores it:
        //   link: { label: 'Explore 2RP', href: 'https://banodoco.ai/2RP' },
        // The site menu's own 2RP row does still point there — see `site.links`
        // at the foot of this file, and the note on it.
        body: [
          '2RP is an art and tech publication that aims to highlight the best of the ecosystem.',
          'Open work, open models, and the people making both.',
        ],
        status: 'Coming soon.',
      },
    },

    // --- Connect chapter: the three ground-network hubs (16-connect-ground-
    // restage.md §2 — ADOS, Hivemind, Discord; `community` retired, with a
    // legacy deep-link alias community -> discord in journey.js normaliseNode) ---
    ados: {
      chapter: 'connect',
      label: 'ADOS',
      short: 'Where online becomes in-person.',
      card: {
        title: 'ADOS',
        // banodoco.ai's own ADOS section, both lines close to verbatim: "ADOS
        // events bring the community together in the real world" / "We gather
        // our community with people from the extended creative world to look
        // at art, eat nice food, and create things." The second is kept whole
        // because its specificity is the point — "eat nice food" is what tells
        // a reader this is a gathering and not a conference.
        body: [
          'ADOS events bring the community together in the real world.',
          'We gather our community with people from the extended creative world to look at art, eat nice food, and create things.',
        ],
        link: { label: 'See events', href: 'https://ados.events/' },
      },
    },
    hivemind: {
      chapter: 'connect',
      label: 'Hivemind',
      short: 'The ecosystem’s collective intelligence.',
      card: {
        title: 'Hivemind',
        // RESOLVED — Hannah supplied the source, 2026-08-16:
        // github.com/banodoco/hivemind. This node shipped "Coming soon" for
        // half a day because Hivemind appears nowhere on banodoco.ai, in that
        // site's repository, or in its bundle (searched: zero hits in all
        // three). It was never missing — it simply lives in a repository of its
        // own rather than on the marketing site. Worth remembering the next
        // time this file cannot find something: banodoco.ai is not the whole
        // organisation.
        //
        // Copy below is that repository's own README and description. The
        // brief's original one-liner for this hub — "persistent shared memory"
        // (16-connect-ground-restage.md, and the braided route with memory
        // points in BUDGETS.md) — turns out to have been exactly right, which
        // is why the geometry still fits the thing it is labelling.
        body: [
          'Hivemind is the open-source AI art ecosystem’s collective intelligence: a searchable corpus of what the community has already worked out.',
          'It drops into a coding agent and opens up the Banodoco Discord’s accumulated practice — messages, resources, and curated answers that cite their sources. Every question researched becomes a permanent entry for the next person.',
        ],
        link: { label: 'View on GitHub', href: 'https://github.com/banodoco/hivemind' },
      },
    },
    discord: {
      chapter: 'connect',
      label: 'Discord',
      short: 'The everyday door into the community.',
      card: {
        title: 'Discord',
        body: [
          'The Discord is where the community actually lives, day to day.',
          'Artists, engineers, and knowledge sharers, in one room — it is where the work gets shown, argued over, and picked up by someone else.',
        ],
        // The invite banodoco.ai itself uses — its footer, its header, and
        // src/lib/discord.ts, which is the single constant all three read.
        // MIRRORED in index.html's hero Discord pill; the two were '#' together
        // and were wired together, as the retired TODO here asked.
        link: { label: 'Join the Discord', href: 'https://discord.gg/NnFxGvx94b' },
      },
    },

    // --- Owned chapter: three ownership pods (09-chapter-owned.md OW-3) ---
    // Pod explanatory states use the EXACT approved claims from the locked
    // copy table (13-content-ops.md, "Owned claims" row) — those strings stay
    // locked and untouched. The surrounding explanatory sentences were the
    // placeholder half; as of 2026-08-16 they carry Banodoco's own published
    // wording from banodoco.ai/ownership instead.
    //
    // These three pods are NOT RENDERED in this build — Owned registers the
    // sixteen contributor-N hotspots, not pods — so nothing below reaches a
    // visitor today. They are kept accurate anyway, because the day a pod does
    // render is exactly the day nobody will re-check its copy.
    'pod-shared': {
      chapter: 'owned',
      label: '100% shared',
      short: 'The dominant principle.',
      card: {
        title: '100% shared',
        // Locked claim string, verbatim: "100% shared".
        claim: '100% shared',
        body: [
          'Ownership of Banodoco is 100% shared with the people who build it.',
          // banodoco.ai's own Ownership section, verbatim. It is the sentence
          // that answers the obvious objection to the claim above — "100% of
          // what, exactly?" — and it answers it by naming the one carve-out
          // rather than hiding it.
          'Aside from investor dilution, open source contributors will own all of our company. We believe that a company that’s built with the community should belong to the community.',
        ],
      },
    },
    'pod-monthly': {
      chapter: 'owned',
      label: 'Granted 1% per month',
      short: 'Gradual distribution over time.',
      card: {
        title: 'Granted 1% per month',
        // Locked claim string, verbatim: "Granted 1% per month".
        claim: 'Granted 1% per month',
        body: [
          'Ownership is granted 1% per month, gradually, over time.',
          // banodoco.ai/ownership: "each month, 1% of the company will be split
          // equally between contributors" who "contribute open source work
          // that's aligned with our core goals". The qualifier is load-bearing
          // and is kept — the grant is for aligned open work, not for showing up.
          'Each month, 1% of the company is split between the people who contributed open-source work aligned with its goals.',
        ],
      },
    },
    'pod-split': {
      chapter: 'owned',
      label: 'Split between groups',
      short: 'Artists, core engineers, knowledge creators.',
      card: {
        title: 'Split between different groups',
        // Locked claim string, verbatim: "Split between different groups", naming
        // artists, core engineers, and knowledge creators (13-content-ops.md).
        claim: 'Split between different groups',
        claimDetail: 'artists, core engineers, and knowledge creators',
        // THE LEDGER NAMES FOUR GROUPS, NOT THREE, and this is the one factual
        // correction this pass makes rather than a copy change. banodoco.ai/
        // ownership: "Up until February 2024, the amount each month was split
        // equally between all contributors. After this ... we'll split 0.25% to
        // each major group - core, infrastructure builders, knowledge sharers,
        // and artists." The public grants ledger has recorded exactly those
        // four buckets every month since.
        //
        // The locked strings above are NOT touched — `claim` and `claimDetail`
        // are 13-content-ops.md's "Owned claims" row, annotated "Do not
        // paraphrase these", and Hannah's chapter `sub` states the same three.
        // Only the explanatory sentence, which was always the placeholder half,
        // carries the fourth group. FLAGGED, not silently reconciled: three
        // strings on this site say three groups where the ledger says four, and
        // which way that gets fixed is Hannah's and Peter's call, not a
        // side-effect of a link pass. The contributor roster below is grouped
        // by the ledger's four.
        body: [
          'Shared ownership is split between different groups: artists, core engineers, and knowledge creators.',
          'Since February 2024 the monthly 1% has been divided evenly across four groups — 0.25% each to core, infrastructure builders, knowledge sharers, and artists — and split within each.',
        ],
      },
    },
  },

  // --- Owned chapter: contributor portrait field (09-chapter-owned.md OW-4) ---
  //
  // REAL PEOPLE AS OF 2026-08-16. Until today all sixteen rows were the literal
  // name "Contributor" with consent:false, because CO-1.4/OW-4.4 said real
  // names arrive only through a consent pipeline (CO-1.3) that was never built.
  //
  // The pipeline is not what unblocked this. THE NAMES WERE ALREADY PUBLIC —
  // Banodoco publishes its complete ownership ledger, by name and by month, at
  // https://banodoco.ai/ownership, and renders 198 of these contributors'
  // avatars on its own front page. Every name below is taken from that ledger
  // (its source of record is `src/components/sections/Ownership/data.ts` in
  // github.com/banodoco/Banodoco-website). Publishing here what Banodoco
  // publishes about itself needs no further consent step; this is the same
  // organisation's own roster on its own new site.
  //
  // WHAT consent:true MEANS ON THESE ROWS, precisely, because the flag is a
  // failsafe and overstating it would disarm one: "cleared to display by name",
  // on the public-ledger basis above — not "completed CO-1.3". The flag's only
  // consumer is `setConsentEnforced(on)` in chapters/owned/portraits.js, which
  // forces the anonymous glyph for any row without it. Nothing in the running
  // code calls that (verified 2026-08-16 — it is exposed on the chapter API and
  // never invoked), so flipping these did not move a pixel; the field is a
  // switch for a future operator, and it should read true for people whose
  // names are already on Banodoco's own site.
  //
  // PHOTOS ARE ON, from the same source as the names. The field renders each
  // dealt contributor's own avatar out of Banodoco's published sprite
  // (assets/contributor-portraits/), keyed by the same usernames. The stock
  // face set that used to be the only image source in this repo is deleted.
  // `?photos=0` falls back to the procedural busts.
  //
  // THESE SIXTEEN ARE SLOTS, NOT A CAST (Hannah, 2026-08-16: the portraits
  // "should be randomly selected from the few hundred we have and then switch
  // ... upon hovering over the thing at the top").
  //
  // The field has sixteen positions. WHO occupies them is dealt at random from
  // content/contributors.js — 120 real contributors — and re-dealt every time
  // the crown is pressed. So a row below is a position in the geometry, and the
  // `name`/`role`/`blurb` on it are only the OPENING occupant: chapters/owned/
  // portraits.js overwrites all three, in place, on every deal. They are real
  // people rather than empty strings so that the popover still says something
  // true in the seconds before the sprite loads, and if it never loads at all.
  //
  // WHAT MAY NEVER COME APART: a slot's name, role, blurb and face are one
  // person and are dealt together, in a single assignment. The face carries no
  // caption of its own, so the only thing stopping a picture being labelled
  // with somebody else's name is that nothing ever deals them separately.
  //
  // `id` and `seed` DO belong to the slot and never move. `id` is the deep-link
  // target (`#/owned/contributor-7`) and the hotspot key; `seed` drives the
  // procedural bust and the cell's grain, which is what the frozen goldens
  // render. Re-dealing people must not disturb either.
  //
  // ROLES ARE THE LEDGER'S OWN FOUR GROUPS (see the pod-split note above):
  // core, infrastructure builders, knowledge sharers, artists. The retired
  // fourth archetype "Researcher" was invented by the W1-D brief and matched
  // nothing real — infrastructure is the group that actually exists.
  //
  // NO COUNTS, deliberately (CO-3.1/CO-3.3): the ranking above uses grant
  // frequency, but no number reaches the page. Each blurb describes the GROUP,
  // which stays true as the ledger moves; a tally would be a hand-maintained
  // stat going stale from the first month. Seeds are UNCHANGED — they drive the
  // procedural portrait geometry, so the field renders pixel-identically.
  contributors: [
    { id: 'contributor-0', name: 'enigmatic_e', role: 'Artist', blurb: 'Makes work with open models and shows it to the community.', consent: true, seed: 3 },
    { id: 'contributor-1', name: 'thedorbrothers', role: 'Artist', blurb: 'Makes work with open models and shows it to the community.', consent: true, seed: 11 },
    { id: 'contributor-2', name: 'NebSH', role: 'Artist', blurb: 'Makes work with open models and shows it to the community.', consent: true, seed: 19 },
    { id: 'contributor-3', name: 'Hannah Submarine', role: 'Artist', blurb: 'Makes work with open models and shows it to the community.', consent: true, seed: 27 },
    { id: 'contributor-4', name: 'POM', role: 'Core', blurb: 'Core contributor, on the ledger every month since it opened.', consent: true, seed: 8 },
    { id: 'contributor-5', name: 'lone_samurai', role: 'Core', blurb: 'Core contributor to Banodoco itself.', consent: true, seed: 16 },
    { id: 'contributor-6', name: 'matt3o', role: 'Core', blurb: 'Core contributor to Banodoco itself.', consent: true, seed: 24 },
    { id: 'contributor-7', name: 'Ian_G', role: 'Core', blurb: 'Core contributor to Banodoco itself.', consent: true, seed: 32 },
    { id: 'contributor-8', name: 'citizenplain', role: 'Knowledge Sharer', blurb: 'Shares the knowledge and tools the rest of the ecosystem builds on.', consent: true, seed: 5 },
    { id: 'contributor-9', name: 'cyncratic', role: 'Knowledge Sharer', blurb: 'Shares the knowledge and tools the rest of the ecosystem builds on.', consent: true, seed: 13 },
    { id: 'contributor-10', name: 'Klinter', role: 'Knowledge Sharer', blurb: 'Shares the knowledge and tools the rest of the ecosystem builds on.', consent: true, seed: 21 },
    { id: 'contributor-11', name: 'ryanontheinside', role: 'Knowledge Sharer', blurb: 'Shares the knowledge and tools the rest of the ecosystem builds on.', consent: true, seed: 29 },
    { id: 'contributor-12', name: 'Kijai', role: 'Infrastructure', blurb: 'Builds the open-source infrastructure the ecosystem runs on.', consent: true, seed: 6 },
    { id: 'contributor-13', name: 'Kosinkadink', role: 'Infrastructure', blurb: 'Builds the open-source infrastructure the ecosystem runs on.', consent: true, seed: 14 },
    { id: 'contributor-14', name: 'melmass', role: 'Infrastructure', blurb: 'Builds the open-source infrastructure the ecosystem runs on.', consent: true, seed: 22 },
    { id: 'contributor-15', name: 'Juxtapoz', role: 'Infrastructure', blurb: 'Builds the open-source infrastructure the ecosystem runs on.', consent: true, seed: 30 },
  ],

  // --- The site's outbound links + legal line.
  //
  // PROVENANCE: this key was `footer` and held the post-epilogue footer's
  // content (10-chapter-final.md FN-3.2). The navigation redux (Hannah,
  // 2026-08-09) removed that footer; these links and the legal line now live
  // in the right-side navigator's site-map panel (journey/rail.js) and in the
  // static tier's copy of it. Renamed `site` because that is what it is now:
  // the site's own outbound destinations, not a footer's.
  //
  // WIRED 2026-08-16. Every destination below is one banodoco.ai itself uses:
  // the first five resolve through its `src/lib/externalLinks.ts` and
  // `src/lib/discord.ts`, which are the single constants its own header and
  // footer read. No '#' remains.
  site: {
    links: [
      { label: 'banodoco.ai', href: 'https://banodoco.ai/' },
      // KEPT AS A LINK even though the `tworp` node above deliberately has
      // none. These are different promises: the node says "the publication is
      // coming soon" and must not offer a door to something else, while a menu
      // row labelled 2RP is navigation to the page Banodoco actually publishes
      // under that name (and links from its own hero). Delete this row if
      // Hannah would rather the name not appear anywhere until it ships.
      { label: '2RP', href: 'https://banodoco.ai/2RP' },
      // WAS 'Contact', RETIRED. Banodoco has no contact page, no contact form
      // and no published address — its own footer offers exactly three doors,
      // X, GitHub and Discord, all three of which this menu already carries
      // below. A "Contact" row could only have been wired to one of those
      // under a second name, or to an invented mailbox. The ownership page is
      // the real destination this menu was missing: it is where the site's
      // biggest claim gets explained, and the Owned chapter's own button
      // points there too.
      // Points at the site's own ownership page since 2026-08-17 (Hannah) —
      // same ledger, this site's dress. The Owned chapter's "Learn more"
      // moved with it; the two must stay in step.
      { label: 'Ownership', href: './ownership/' },
    ],
    social: [
      { label: 'Discord', href: 'https://discord.gg/NnFxGvx94b' },
      { label: 'GitHub', href: 'https://github.com/banodoco' },
      // Added — the third door in banodoco.ai's own footer, and the only one
      // this menu was missing. Their footer labels it "X (Twitter)" on an icon
      // and the URL they keep is the twitter.com one; both are set as they
      // have them rather than modernised.
      { label: 'X', href: 'https://twitter.com/banodoco' },
    ],
    // REAL, and no longer pending Legal. Every figure here is published by
    // Banodoco about itself at https://banodoco.ai/ownership — the 100%, the
    // monthly 1%, and the 0.25%-per-group split that has run since February
    // 2024. This states the four groups the ledger actually uses; see the
    // pod-split note above for the three-vs-four discrepancy with the locked
    // claims, which is flagged there for Hannah and Peter rather than settled
    // here. The one thing this line no longer does is describe itself as a
    // placeholder while making legal-sounding claims — which was the worst of
    // both.
    legal: '© 2026 Banodoco. Ownership is 100% shared with contributors: 1% of the company is granted each month, split evenly between core, infrastructure builders, knowledge sharers, and artists. Full ledger at banodoco.ai/ownership.',
  },
};
