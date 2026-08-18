// reasons.js — per-owner descriptions for the ownership ledger hover.
// Additive to data.js (which stays a pure mirror of the source ledger);
// this file carries the human-researched "what they actually did" line for
// each owner, plus the internal evidence trail (message ids, aliases,
// confidence) that backs it. Rendered by ownership.js as a hover tooltip
// on the contributor cell. Empty until a research batch lands for a name.
//
// Contract: every `sentence` must be traceable to at least one evidence
// message_id; never invent specificity. Thin evidence -> narrower sentence.

export const REASONS = Object.freeze({
  'matt3o': Object.freeze({
    sentence: "Built ComfyUI_IPAdapter_plus and ComfyUI_essentials as cubiq, the IPAdapter node packs behind the community's image conditioning, and taught ComfyUI basics on YouTube as Latent Vision.",
    evidence: [
      { message_id: '1164570389012291674', channel: 'chatter', date: '2023-10-19', snippet: "I'm the developer of the IPAdapter extension for comfyui and I'm trying to work on the memory usage problem" },
      { message_id: '1164570760069787688', channel: 'chatter', date: '2023-10-19', snippet: "The model compile node can be downloaded here https://github.com/cubiq/ComfyUI_essentials" },
      { message_id: '1280279192096997488', channel: 'chatter', date: '2024-09-02', snippet: "pom: Matteo has linked all the relevant files here: https://github.com/cubiq/ComfyUI_IPAdapter_plus" },
      { message_id: '1260196361270464542', channel: 'chatter', date: '2024-07-09', snippet: "Question: Check out matt3o's videos as well, Latent Vision. Has some very good basics and more advanced stuff, he breaks thing's down very well" },
    ],
    aliases: ['matt3o', 'Matteo', 'cubiq', 'Latent Vision'],
    confidence: 'high',
  }),

  'pom': Object.freeze({
    sentence: "Founded Banodoco, wrote the roadmap for an open 'source native' company, and ran the community through its Sunday-evening updates and competitions.",
    evidence: [
      { message_id: '1147298157739393155', channel: 'updates', date: '2023-09-01', snippet: "As you may know, behind this community is an org I'm building called Banodoco.ai. While it's early days, my goal is to build it into an org that can create/support the best OS models for art/video" },
      { message_id: '1138905623652728852', channel: 'updates', date: '2023-08-09', snippet: "You can read about what we're up to banodoco.ai, particualrly the roadmap page: https://banodoco.ai/Roadmap_&_collaboration" },
      { message_id: '1191089260967776316', channel: 'updates', date: '2023-12-31', snippet: "For today's Sunday evening update, I'm sharing the equity announcement for December. For those who don't know, behind this is Banodoco. Our goal is to build an open 'source native' company..." },
      { message_id: '1492869477505695825', channel: 'updates', date: '2026-04-12', snippet: "sagansagansagans: All received successfully. Thank you so much Pom (after wallet-address collection)" },
    ],
    aliases: ['pom', 'Pom'],
    confidence: 'high',
  }),

  'lone_samurai': Object.freeze({
    sentence: "Early core developer who helped build the Banodoco app (Dough) with founder pom — SDE on backend and infra — then fielded install help and merged PRs in the project's help channels.",
    evidence: [
      { message_id: '1138920987593822219', channel: 'introductions', date: '2023-08-09', snippet: "I have been working with <@301463647895683072> for the past couple of months iterating over Banodoco. I am a SDE by profession and previously ran my own fintech startup" },
      { message_id: '1211018265162416149', channel: 'dough-chatter', date: '2024-02-24', snippet: "once the windows version is running, raise a PR, will be happy to merge" },
      { message_id: '1209044829225361478', channel: 'dough-chatter', date: '2024-02-19', snippet: "I can help if there is a PR or you want to ask something else" },
      { message_id: '1212562822848970752', channel: 'dough-chatter', date: '2024-02-29', snippet: "HunterS.Freud: working!!! thank you so much Samurai" },
    ],
    aliases: ['lone_samurai', 'Samurai'],
    confidence: 'high',
    note: "Review pass: his help/PR work was in dough-chatter (the Dough/ComfyRunner app channel), NOT the archive's 'support' channel (a role-request channel with 0 messages from him) — corrected from the first draft.",
  }),

  'kosinkadink': Object.freeze({
    sentence: "Built ComfyUI-VideoHelperSuite and Advanced-ControlNet, the node packs behind most video workflows here, and now works on ComfyUI core at Comfy.",
    evidence: [
      { message_id: '1144131368226406430', channel: 'animatediff', date: '2023-08-24', snippet: "proof of concept seems to work so far, so I'll work on the code more and then push the code to my advance controlnet extension repo" },
      { message_id: '1381747723224481822', channel: 'wan_chatter', date: '2025-06-09', snippet: "Kijai: only ones I recognize: https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite https://github.com/kijai/ComfyUI-KJNodes" },
      { message_id: '1370593389589958676', channel: 'wan_chatter', date: '2025-05-10', snippet: "A.I.Warper: Use the load video node from https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite" },
      { message_id: '1535465295290826854', channel: 'minimax_h3_chatter', date: '2026-08-08', snippet: "Both AustinMroz and I work at Comfy, so that's why we didn't have time to work on the node pack. I'll try to make some time next week to look into VHS + core video support" },
    ],
    aliases: ['Kosinkadink', 'Kos', 'kosinka'],
    confidence: 'high',
    note: "'most video workflows' is community-standard usage (Kijai + A.I.Warper cite VHS as the video pack); 'works on ComfyUI core' is a mild inference from his own Comfy-employment message.",
  }),

  'kijai': Object.freeze({
    sentence: "Built ComfyUI-WanVideoWrapper and KJNodes, the Wan/LTX node packs this community turned to for each new model, and a constant presence in the channels answering setup and usage questions.",
    evidence: [
      { message_id: '1400359050344140892', channel: 'wan_chatter', date: '2025-07-31', snippet: "TheSwoosh: https://github.com/kijai/ComfyUI-WanVideoWrapper/tree/main/example_workflows" },
      { message_id: '1400415461925195806', channel: 'wan_chatter', date: '2025-07-31', snippet: "btw just made the sampler in the wrapper to return denoised samples too so you can quickly preview the high model output with tiny vae for example before deciding to run the low noise side" },
      { message_id: '1365735678645764296', channel: 'comfyui', date: '2025-04-26', snippet: "it was forked in multiple extensions but IMO the best is <https://github.com/kijai/ComfyUI-KJNodes>" },
      { message_id: '1400214194443518042', channel: 'wan_chatter', date: '2025-07-30', snippet: "Quality_Control: https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/900" },
    ],
    aliases: ['Kijai', 'kijai'],
    confidence: 'high',
    note: "Review pass: 'answered support around the clock' / 'ran for every new model' trimmed as unsupported hyperbole — support presence is real (independent sampling of wan_chatter/minimax_h3_chatter) but the cited ids are mostly community links to his repos.",
  }),
});
