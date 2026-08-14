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
// Everything else in this file is PLACEHOLDER content per decision D10
// (journey-v6-plan/DECISIONS.md): "Contributors, initiative links, and live
// stats ship as placeholders for now (anonymous ember-nodes, '#' links
// marked PLACEHOLDER, no live modules)." Every placeholder string contains
// the literal token "PLACEHOLDER" so it is greppable:
//
//   grep -rn PLACEHOLDER content/content.js
//
// Equip/PYPE/Arnold/Astrid are deferred out of this active build — their
// donor content is preserved in ./content-archive-deferred.js, not
// imported here. Do not rename this export or any node id: chapters and
// core read this object directly (per donor journey/core/content.js).
//
// NO LIVE MODULES: nothing in this file is a manually-maintained activity
// number (per 13-content-ops.md CO-3.1). Status lines below are explicitly
// placeholder text, not fabricated stats — real values must come from an
// automated source with an agreed freshness rule, or the module doesn't
// ship (CO-3.3).

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
          href: '#',
          // TODO(Banodoco): PLACEHOLDER — confirm the real destination URL for
          // "Owned by the ecosystem" (the ownership / contributor page) before
          // launch. Same convention as the spotlight links above: '#' plus this
          // note. No URL is confirmed, so none is invented here; the donor
          // build's https://banodoco.ai guess is NOT a confirmation.
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
      label: 'Arca Gidan Prize',
      short: 'A competition pushing open-source AI art further. [PLACEHOLDER]',
      spotlight: {
        title: 'Arca Gidan Prize',
        body: [
          'This is placeholder summary copy standing in for the Arca Gidan Prize spotlight until Content/Ops drafts real copy and Peter approves it before G4. [PLACEHOLDER]',
          'It exists here only to hold the spotlight layout together — treat every claim in this paragraph as unverified filler, not a description of the actual prize. [PLACEHOLDER]',
        ],
        // Status line: explicitly NOT a live stat (CO-3.1 — no manually maintained
        // activity numbers). Real status needs an automated source + freshness rule,
        // or this line does not ship (CO-3.3).
        status: 'Status: to be confirmed by Banodoco [PLACEHOLDER]',
        link: { label: 'Learn more', href: '#' },
        // TODO(Banodoco): PLACEHOLDER — confirm the real destination URL for the
        // Arca Gidan Prize before launch. Donor journey/core/content.js pointed a
        // sibling node at https://banodoco.ai as a guess only; do not treat that
        // as confirmed.
      },
    },
    artcompute: {
      chapter: 'inspire',
      label: 'ArtCompute',
      short: 'Practical compute for ambitious creators. [PLACEHOLDER]',
      spotlight: {
        title: 'ArtCompute',
        body: [
          'This is placeholder summary copy standing in for the ArtCompute spotlight until Content/Ops drafts real copy and Peter approves it before G4. [PLACEHOLDER]',
          'Nothing in this paragraph — including the framing of what ArtCompute offers — should be read as confirmed program detail. [PLACEHOLDER]',
        ],
        status: 'Status: to be confirmed by Banodoco [PLACEHOLDER]',
        link: { label: 'Learn more', href: '#' },
        // TODO(Banodoco): PLACEHOLDER — confirm the real destination URL for
        // ArtCompute before launch. Donor guessed https://banodoco.ai; unconfirmed.
      },
    },
    tworp: {
      chapter: 'inspire',
      label: '2RP',
      short: 'Rigorous research in AI art. [PLACEHOLDER]',
      spotlight: {
        title: '2RP',
        body: [
          'This is placeholder summary copy standing in for the 2RP spotlight until Content/Ops drafts real copy and Peter approves it before G4. [PLACEHOLDER]',
          'Per 07-chapter-inspire.md IN-4.3, this contextual spotlight is a distinct behaviour from the site menu’s 2RP link, which must keep opening the publication directly. (The header’s own 2RP control was removed 2026-08-10.) [PLACEHOLDER]',
        ],
        status: 'Status: to be confirmed by Banodoco [PLACEHOLDER]',
        link: { label: 'Read the publication', href: '#' },
        // TODO(Banodoco): PLACEHOLDER — confirm the real 2RP publication URL
        // before launch. Donor guessed https://banodoco.ai/2rp; unconfirmed.
      },
    },

    // --- Connect chapter: the three ground-network hubs (16-connect-ground-
    // restage.md §2 — ADOS, Hivemind, Discord; `community` retired, with a
    // legacy deep-link alias community -> discord in journey.js normaliseNode) ---
    ados: {
      chapter: 'connect',
      label: 'ADOS',
      short: 'Where online becomes in-person. [PLACEHOLDER]',
      card: {
        title: 'ADOS',
        body: [
          'This is placeholder card copy standing in for the ADOS structure until Content/Ops drafts and Peter approves real copy. [PLACEHOLDER]',
          'Treat this description as a layout stand-in only, not a finished description of ADOS. [PLACEHOLDER]',
        ],
      },
    },
    hivemind: {
      chapter: 'connect',
      label: 'Hivemind',
      short: 'Persistent shared memory. [PLACEHOLDER]',
      card: {
        title: 'Hivemind',
        body: [
          'This is placeholder card copy standing in for the Hivemind structure until Content/Ops drafts and Peter approves real copy. [PLACEHOLDER]',
          'Treat this description as a layout stand-in only, not a finished description of Hivemind. [PLACEHOLDER]',
        ],
      },
    },
    discord: {
      chapter: 'connect',
      label: 'Discord',
      short: 'The everyday door into the community. [PLACEHOLDER]',
      card: {
        title: 'Discord',
        body: [
          'This is placeholder card copy standing in for the Discord hub until Content/Ops drafts and Peter approves real copy. [PLACEHOLDER]',
          'Treat this description as a layout stand-in only, not a finished description of the Discord community. [PLACEHOLDER]',
        ],
        link: { label: 'Join the Discord', href: '#' },
        // TODO(Banodoco): PLACEHOLDER — same destination as the hero nav's
        // Discord pill (index.html), which is itself an unconfirmed '#'.
        // Wire BOTH to the real invite URL together before launch.
      },
    },

    // --- Owned chapter: three ownership pods (09-chapter-owned.md OW-3) ---
    // Pod explanatory states use the EXACT approved claims from the locked
    // copy table (13-content-ops.md, "Owned claims" row) — these strings are
    // locked, not placeholder. Only the surrounding explanatory sentences
    // (which restate/expand the claim) are placeholder pending Peter's copy
    // approval, so those are the parts marked [PLACEHOLDER].
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
          'This explanatory sentence is placeholder phrasing around the locked claim above, pending Content/Ops draft and Peter approval. [PLACEHOLDER]',
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
          'This explanatory sentence is placeholder phrasing around the locked claim above, pending Content/Ops draft and Peter approval. [PLACEHOLDER]',
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
        body: [
          'Shared ownership is split between different groups: artists, core engineers, and knowledge creators.',
          'This explanatory sentence is placeholder phrasing around the locked claim above, pending Content/Ops draft and Peter approval. [PLACEHOLDER]',
        ],
      },
    },
  },

  // --- Owned chapter: contributor portrait field (09-chapter-owned.md OW-4) ---
  // Per CO-1.4 / OW-4.4: nobody is consented yet, so every entry below ships
  // as the anonymous ember-node fallback (consent: false). Per the W1-D task
  // brief, name is intentionally the literal string "Contributor" for all 16
  // — real names arrive only through the consent pipeline (CO-1.3) and are
  // gated in code by consent: true (OW-4.4), never by editing this file's
  // placeholder rows in place.
  //
  // Roles are varied archetypes across the three ownership groups named in
  // pod-split, plus a fourth "Researcher" archetype, per the task brief's
  // "artist / core engineer / knowledge creator / researcher..." examples.
  // No activity numbers, follower counts, or project counts are attached to
  // any entry (CO-3.1).
  contributors: [
    { id: 'contributor-0', name: 'Contributor', role: 'Artist', blurb: 'A placeholder contribution note for an anonymous artist, pending consent. [PLACEHOLDER]', consent: false, seed: 3 },
    { id: 'contributor-1', name: 'Contributor', role: 'Artist', blurb: 'A placeholder contribution note for an anonymous artist, pending consent. [PLACEHOLDER]', consent: false, seed: 11 },
    { id: 'contributor-2', name: 'Contributor', role: 'Artist', blurb: 'A placeholder contribution note for an anonymous artist, pending consent. [PLACEHOLDER]', consent: false, seed: 19 },
    { id: 'contributor-3', name: 'Contributor', role: 'Artist', blurb: 'A placeholder contribution note for an anonymous artist, pending consent. [PLACEHOLDER]', consent: false, seed: 27 },
    { id: 'contributor-4', name: 'Contributor', role: 'Core Engineer', blurb: 'A placeholder contribution note for an anonymous core engineer, pending consent. [PLACEHOLDER]', consent: false, seed: 8 },
    { id: 'contributor-5', name: 'Contributor', role: 'Core Engineer', blurb: 'A placeholder contribution note for an anonymous core engineer, pending consent. [PLACEHOLDER]', consent: false, seed: 16 },
    { id: 'contributor-6', name: 'Contributor', role: 'Core Engineer', blurb: 'A placeholder contribution note for an anonymous core engineer, pending consent. [PLACEHOLDER]', consent: false, seed: 24 },
    { id: 'contributor-7', name: 'Contributor', role: 'Core Engineer', blurb: 'A placeholder contribution note for an anonymous core engineer, pending consent. [PLACEHOLDER]', consent: false, seed: 32 },
    { id: 'contributor-8', name: 'Contributor', role: 'Knowledge Creator', blurb: 'A placeholder contribution note for an anonymous knowledge creator, pending consent. [PLACEHOLDER]', consent: false, seed: 5 },
    { id: 'contributor-9', name: 'Contributor', role: 'Knowledge Creator', blurb: 'A placeholder contribution note for an anonymous knowledge creator, pending consent. [PLACEHOLDER]', consent: false, seed: 13 },
    { id: 'contributor-10', name: 'Contributor', role: 'Knowledge Creator', blurb: 'A placeholder contribution note for an anonymous knowledge creator, pending consent. [PLACEHOLDER]', consent: false, seed: 21 },
    { id: 'contributor-11', name: 'Contributor', role: 'Knowledge Creator', blurb: 'A placeholder contribution note for an anonymous knowledge creator, pending consent. [PLACEHOLDER]', consent: false, seed: 29 },
    { id: 'contributor-12', name: 'Contributor', role: 'Researcher', blurb: 'A placeholder contribution note for an anonymous researcher, pending consent. [PLACEHOLDER]', consent: false, seed: 6 },
    { id: 'contributor-13', name: 'Contributor', role: 'Researcher', blurb: 'A placeholder contribution note for an anonymous researcher, pending consent. [PLACEHOLDER]', consent: false, seed: 14 },
    { id: 'contributor-14', name: 'Contributor', role: 'Researcher', blurb: 'A placeholder contribution note for an anonymous researcher, pending consent. [PLACEHOLDER]', consent: false, seed: 22 },
    { id: 'contributor-15', name: 'Contributor', role: 'Researcher', blurb: 'A placeholder contribution note for an anonymous researcher, pending consent. [PLACEHOLDER]', consent: false, seed: 30 },
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
  // All hrefs are '#' per D10 until Banodoco supplies confirmed
  // destinations. TODO comments capture what each link is meant to become.
  site: {
    links: [
      { label: 'banodoco.ai', href: '#' },
      // TODO(Banodoco): PLACEHOLDER — confirm and wire the real banodoco.ai
      // homepage URL.
      { label: '2RP', href: '#' },
      // TODO(Banodoco): PLACEHOLDER — confirm and wire the real 2RP
      // publication URL.
      { label: 'Contact', href: '#' },
      // TODO(Banodoco): PLACEHOLDER — confirm and wire the real contact
      // destination (mailto or form).
    ],
    social: [
      { label: 'Discord', href: '#' },
      // TODO(Banodoco): PLACEHOLDER — confirm and wire the real Discord
      // invite URL.
      { label: 'GitHub', href: '#' },
      // TODO(Banodoco): PLACEHOLDER — confirm and wire the real GitHub
      // organization/repo URL.
    ],
    // Legal placeholder line — not locked copy; ownership facts themselves
    // (100%, 1%/month, three groups) are locked verbatim per 13-content-ops.md,
    // but the surrounding legal sentence and copyright line need Legal/Peter
    // sign-off before launch.
    legal: '© 2026 Banodoco. Ownership: 100% shared, granted at 1% per month, split between different groups (artists, core engineers, and knowledge creators). This legal line is placeholder text pending Legal/Peter review. [PLACEHOLDER]',
  },
};
