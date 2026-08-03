// Content model for the Mushroom Journey v6 — FIVE-chapter build
// (Mission, Inspire, Connect, Owned, Final/epilogue).
//
// Single source of truth for chapter copy, node copy, contributor profiles,
// and footer links — per journey-v6-plan/13-content-ops.md, CO-2.2:
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
      sub: 'Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem.',
    },
    inspire: {
      nav: 'Inspire',
      // Locked verbatim — 13-content-ops.md locked copy table, "Inspire H".
      heading: 'Inspire and empower.',
      // Locked verbatim — 07-chapter-inspire.md "Copy (locked)" support line, and
      // explicitly called out as approved-in-handoff text to include per the
      // W1-D task brief. Not a placeholder.
      sub: 'Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons.',
    },
    connect: {
      nav: 'Connect',
      // Locked verbatim — 13-content-ops.md locked copy table, "Connect H" / "Connect sub".
      heading: 'Connect the ecosystem.',
      sub: 'Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art.',
    },
    owned: {
      nav: 'Owned',
      // Locked verbatim — 09-chapter-owned.md "Copy and claims (locked, literal, final)".
      // The locked copy table in 13 only carries the claims line; the heading
      // itself is locked in the chapter doc, so it is sourced from there.
      heading: 'Owned by the ecosystem',
      // Owned has no single prose "sub" — copy position is top-centre and the
      // three ownership claims (locked verbatim, 13-content-ops.md "Owned claims"
      // row) carry the message instead. Do not paraphrase these.
      claims: [
        { id: 'pod-shared', text: '100% shared', tier: 'primary' },
        { id: 'pod-monthly', text: 'Granted 1% per month', tier: 'secondary' },
        {
          id: 'pod-split',
          text: 'Split between different groups',
          detail: 'artists, core engineers, and knowledge creators',
          tier: 'secondary',
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
      heading: 'We’re working to accelerate the second renaissance.',
      sub: 'Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many.',
    },
  },

  nodes: {
    // --- Inspire chapter: three spore-exit spotlights (07-chapter-inspire.md IN-1.2) ---
    arca: {
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
      label: '2RP',
      short: 'Rigorous research in AI art. [PLACEHOLDER]',
      spotlight: {
        title: '2RP',
        body: [
          'This is placeholder summary copy standing in for the 2RP spotlight until Content/Ops drafts real copy and Peter approves it before G4. [PLACEHOLDER]',
          'Per 07-chapter-inspire.md IN-4.3, this contextual spotlight is a distinct behaviour from the persistent top-right 2RP control, which must keep opening the publication directly. [PLACEHOLDER]',
        ],
        status: 'Status: to be confirmed by Banodoco [PLACEHOLDER]',
        link: { label: 'Read the publication', href: '#' },
        // TODO(Banodoco): PLACEHOLDER — confirm the real 2RP publication URL
        // before launch. Donor guessed https://banodoco.ai/2rp; unconfirmed.
      },
    },

    // --- Connect chapter: three semantic structures (08-chapter-connect.md CN-2) ---
    community: {
      label: 'Community',
      short: 'The connected commons. [PLACEHOLDER]',
      card: {
        title: 'Community',
        body: [
          'This is placeholder card copy standing in for the Community structure until Content/Ops drafts and Peter approves real copy. [PLACEHOLDER]',
          'Treat this description as a layout stand-in only, not a finished description of the community. [PLACEHOLDER]',
        ],
      },
    },
    ados: {
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

    // --- Owned chapter: three ownership pods (09-chapter-owned.md OW-3) ---
    // Pod explanatory states use the EXACT approved claims from the locked
    // copy table (13-content-ops.md, "Owned claims" row) — these strings are
    // locked, not placeholder. Only the surrounding explanatory sentences
    // (which restate/expand the claim) are placeholder pending Peter's copy
    // approval, so those are the parts marked [PLACEHOLDER].
    'pod-shared': {
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

  // --- Final/epilogue footer (10-chapter-final.md FN-3.2: "a conventional
  // footer follows: plain-text links, social, contact, legal, crawlable
  // index"). All hrefs are '#' per D10 until Banodoco supplies confirmed
  // destinations. TODO comments capture what each link is meant to become.
  footer: {
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
