BANODOCO WEBSITE
# The Mushroom Journey — Extension Handoff
Extending the implemented Mission hero into an Inspire-first continuous journey while preserving the current implementation

[[IMAGE: image9.png]]
Existing implementation baseline: preserve the approved Mission hero and extend the journey from its current resting state.
| Handoff intent
This document now describes an additive extension of the existing implemented Mission hero. The current hero is the accepted baseline, not a scene to rebuild. The brief defines the next camera path, chapter sequence, public claims, micro-interactions, visual continuity, biological direction, and implementation outcomes. It gives a strong technical lead freedom to choose architecture and production methods while making preservation of the current implementation explicit. |



CURRENT IMPLEMENTATION BASELINE
# Extend the accepted hero; do not rebuild it
The Mission hero already exists in the current implementation and is the starting point for this phase. Work begins from its present resting pose and extends the journey after it. The goal is additive development, not a re-platforming or visual reset.
Preserve the existing hero geometry, materials, lighting, camera framing, DOM copy, navigation chrome, 2RP / Discord control, CTA treatment, documentary-optics finish, responsive behaviour, loading path, accessibility behaviour, and current performance characteristics unless a narrowly scoped change is required for continuity.
Reuse the current renderer, camera rig, quality-tier logic, post-processing, state model, asset pipeline, and interface components wherever practical. Do not undertake a broad refactor merely to make the new chapters theoretically cleaner.
Define the current hero pose as the Mission resting state. The existing Explore the ecosystem action and the first continuation of scroll now advance into Inspire.
New chapter assets should lazy-load after the current hero is stable. The initial bundle, first meaningful render, and hero time-to-interactive must not regress materially.
Before extension work begins, capture baseline screenshots, bundle weight, frame time, and interaction behaviour for the implemented hero. The extended build should be reviewed against that baseline so existing quality is not lost.
Equip, PYPE, Arnold, Astrid, and the Astrid detail drawer are intentionally deferred. They are not active chapters, routes, navigation items, scroll allocations, or performance targets in this phase.
EXECUTIVE DIRECTION
# Extend the existing hero into one continuous mushroom circuit.
The current Mission hero remains the established opening. The new work extends from that exact state into a continuous journey around and through the same mushroom: orbit around the rear of the cap to reveal three spore exit regions, move beneath the cap into the shared gill commons, descend to the people-powered mycelium, and finally pull away across the wider colony.
The revised order is intentionally Inspire-first. It lets the extension begin with the most immediate outward expression of Banodoco, then trace that visible release back into the community system beneath it, the ownership layer supporting it, and the wider propagation it enables.
## The narrative order
1. Mission — preserve the implemented hero and establish Banodoco’s purpose.
2. Inspire — orbit around the back of the cap and reveal three biologically grounded spore exit regions.
3. Connect — follow the spore path beneath the cap into the shared gill-and-lattice commons.
4. Owned — descend through the soil into the people-powered mycelial ownership layer.
5. Final pullback — reveal one organism becoming many: the second renaissance spreading.
Equip is intentionally deferred and is not part of the active journey in this phase.
## Why this order is right for the current phase
It is causally coherent for an extension: purpose leads immediately to visible outward activity; the journey then traces that activity back to community, ownership, and wider propagation.
It is anatomically coherent: established exterior view → rear cap and under-cap release regions → gill commons → stipe exterior and soil-line → mycelium → wider field.
It creates two major threshold crossings and one strong reveal: the controlled rear-cap orbit that discovers the spore exits, the move beneath the cap into the gill commons, and the punch through the soil-line into the ownership layer.
It keeps the strongest visual variety while avoiding unnecessary scope: exterior orbit and release, lateral under-cap scale, underground depth, and final recession each have a distinct camera character.
NON-NEGOTIABLES
# What must remain true
The visitor perceives one continuous organism and one continuous journey. Chapter-specific geometry, level of detail, and streaming may be used, but the experience must not read as separate slides or disconnected scenes.
The written direction overrides generated mockups when they disagree. For the current phase, the persistent chapter navigation is Mission · Inspire · Connect · Owned, plus the paired 2RP / Discord control in the top-right. The Final remains an epilogue rather than a peer navigation item.
Equip, PYPE, Arnold, Astrid, and their detail states are deferred. They should not be implemented, preloaded, routed, or given scroll space in the current phase, but their approved conceptual work may be retained for a later extension.
Connect must communicate real network behaviours: Community as a connected commons, ADOS as convergence, and Hivemind as persistent shared memory.
Owned is visibly underground, people-powered, and materially different from Connect. The ownership claims are literal and final: 100% shared; granted at 1% per month; split between artists, core engineers, and knowledge creators.
Real contributors appear in Owned at launch, subject to explicit consent and approved profile copy.
The final scene is an aspirational epilogue, not a sixth peer chapter in the navigation.
Mobile, accessibility, reduced motion, and a complete non-WebGL fallback are first-class requirements.
Future expansion is desirable but negotiable. The first experience should not be weakened merely to achieve one-entry extensibility.
BIOLOGICAL DIRECTION
# A plausible fictional fungus
The organism is a fictional bioluminescent agaric rather than a literal named species. The experience may exaggerate scale and luminosity, but its anatomy and behaviour should follow enough fungal logic to feel discovered rather than designed.
The visible mushroom is a temporary fruiting body. The larger organism is the mycelium already present throughout the substrate.
Avoid tree-root logic. Use a diffuse field of fine hyphae with only a few thicker rhizomorph-like cords, and let the stipe merge into that existing network.
Deferred future direction: if Equip is reintroduced later, PYPE remains a dense braided fascicle of longitudinal hyphae rather than a plant-style vascular tube or perfect cable.
Equip is not part of the current active journey. No current camera path should enter the stipe interior merely to preserve the earlier concept.
Connect uses radial gills, shorter secondary gills, and fine cross-veins or anastomosing tissue to justify the shared lattice.
Spores originate on the under-cap gill surfaces, move through the gill spaces and around the cap margin, then become visible as rising air-borne plumes.
Owned is volumetric, irregular, substrate-bound mycelium with dark pockets, soil aggregates, thick cords, and fine strands at many depths.
The final fairy ring results from the colony growing outward through the substrate. Comparable fruiting bodies appear around an active arc or ring rather than being emitted by one parent mushroom.
Organic asymmetry, moisture, occlusion, density variation, and partial darkness are desirable. Perfect rotational symmetry and uniformly bright strands should be avoided.
| Realism boundary
Biological plausibility supports the metaphor; it does not replace it. Clean DOM labels, ownership statements, and project callouts may remain intentionally non-biological, while the organism and its motion obey the rules above. |

| Conflict priority
When requirements compete, use this order: accessibility and information integrity → perceptual continuity → device performance → visual richness → motion polish → ease of future expansion. |



SPATIAL NARRATIVE
# The current extension journey at a glance
| Stage | Anatomy | Meaning | Dominant motion | Text composition |
| Mission | Existing exterior hero | Purpose and the complete living system | Preserve current resting pose and ambient life | Left |
| Inspire | Rear cap rim, under-cap sources, and three exit regions | Visible initiatives and outward release | Controlled orbit / spin around the back + slight push-in | Bottom |
| Connect | Cross-veined gill commons | Community, convergence, and memory behind the visible output | Move beneath the cap + wide lateral orbit | Left |
| Owned | Underground mycelial mat | People, stewardship, and ownership | Stipe-side descent + soil crossing + low glide | Top-centre |
| Final | Oblique fairy-ring cutaway | Propagation and second renaissance | Rising cutaway + long pullback | Upper-left over diagonal ground plane |

## Current-phase camera resting compositions and transitions
The following matrices consolidate the intended framing and motion into one reference. They define the spatial story and dominant movement, not fixed camera coordinates or final spline values.
| Chapter | Camera / framing | Copy position | Spatial focus |
| Mission | The currently implemented external three-quarter hero pose. Preserve its framing, copy, lighting, optics, and interface treatment. | Left | The complete fruiting body and wider pre-existing colony remain the accepted opening composition. |
| Inspire | From the Mission pose, orbit roughly 120–180° around the rear three-quarter side of the cap with a restrained push-in and no camera roll. | Bottom | Three spatially distinct exit regions become visible around the rear under-cap rim; spores originate between gills, curl around the edge, and rise. |
| Connect | Continue beneath the cap into a wide low-angle chamber of radial gills, shorter secondary gills, and fine cross-veins. | Left | Community is a connected region; ADOS a convergence knot; Hivemind a persistent route through the under-cap tissue. |
| Owned | Leave the under-cap commons, descend along the mushroom exterior or stipe-side surface, cross the soil-line, and level into irregular volumetric substrate. | Top-centre | The 100% shared principle remains primary; secondary ownership explanations and many real contributor nodes occupy depth. |
| Final | Oblique cutaway retaining the surface fairy ring, forest horizon, soil-line, underground colony, and upper spore cloud. | Upper-left / centre-left | Comparable fruiting bodies occupy an active ring; the growth front beneath them makes propagation legible. |

## Movement between chapters
| Transition | Dominant movement and threshold |
| Mission → Inspire | Begin from the existing hero without rebuilding it. Scroll or the existing CTA starts a controlled orbit around the back of the mushroom, with a slight zoom toward the cap rim. Three spore exit regions reveal sequentially as the rear under-cap surface comes into view. |
| Inspire → Connect | After the three release regions are established, follow one spore flow backward and downward around the rim. The cap occludes the sky as the camera slips beneath it into the gill commons; use that occlusion for streaming and LOD changes. |
| Connect → Owned | Move laterally through the chamber toward the stipe-cap junction, then descend along the exterior / surface of the stipe. Do not enter the deferred Equip interior. Cross the soil-line and level into the underground mycelial glide. |
| Owned → Final | Follow the active underground growth front, rise through the substrate, tilt into the above/below-ground cutaway, and continue the recession as the fairy ring and wider colony become visible. |

| Interpretation boundary
These are intended resting compositions and dominant movement directions. The technical and motion team should refine exact geometry, camera splines, scroll allocation, easing, and occlusion opportunities in the grey-box prototype. |

CHAPTER 1
# Mission — preserve the implemented hero
The opening Mission hero is already implemented and approved. Treat it as the visual, technical, and behavioural baseline. Do not rebuild its composition or replace its systems as part of this extension. The new work begins only after the visitor reaches the current resting state and chooses to continue.
[[IMAGE: image9.png]]
Mission: the existing implemented hero remains intact and becomes the fixed starting pose for the extended journey.
## Approved copy direction
“We’re working to help the open-source AI art ecosystem thrive.”
Supporting copy: “Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem.”
## Micro-interactions
Irregular low-amplitude pulses travel from the surrounding mycelium into the fruiting body; the colony never flashes or breathes in perfect synchrony.
Fine spores appear beneath the cap and drift around the rim with subtle airflow before dispersing; they do not erupt from the cap surface.
Gill edges, the cap margin, and selected fibres shift almost imperceptibly with moisture and airflow; avoid obvious whole-object scaling or rhythmic breathing.
Preserve the existing Explore the ecosystem interaction. On activation, it now hands control to the journey timeline and begins one restrained flow toward the cap before the camera starts the Inspire orbit.
The paired 2RP / Discord control behaves as one grouped element with independent hover states.
Tiny hyphal tips at the soil surface brighten, fade, and occasionally branch by a few pixels, creating life without turning the hero into a time-lapse.
Documentary depth comes from slow foreground dust, moisture highlights, and differential focus rather than constant object movement.
## Transition to Inspire
From the existing Mission pose, the camera starts a controlled orbit around the rear three-quarter side of the mushroom, with a slight push-in and upward bias toward the cap. The motion may feel like a slow spin around the organism, but it should avoid camera roll, sudden acceleration, or a full decorative revolution. The current hero remains visually continuous while previously hidden rear and under-cap geometry comes into view. Three distinct spore exit regions reveal sequentially around the back rim.
CHAPTER 2
# Inspire — discover the three spore exits
The first new chapter is discovered by moving around the existing mushroom rather than entering a new scene. As the camera reaches the back side of the cap, three spatially distinct release regions become visible. Fine spores originate between the gills, travel toward the rear cap margin, curl around the rim, and rise into three visible plumes corresponding to Arca Gidan Prize, ArtCompute, and 2RP.
[[IMAGE: image13.png]]
Inspire: a controlled rear-cap orbit reveals three biologically grounded spore exit regions, each fed from the gills beneath the cap.
## Approved copy direction
Heading: “Inspire and empower.”
Supporting copy: Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons.
## Visible initiatives
Arca Gidan Prize — a competition for pushing open-source AI art further.
ArtCompute — practical compute access for ambitious creators.
2RP — a publication advancing rigorous research in AI art.
## Micro-interactions
Hovering an initiative brightens its visible plume and traces the flow backward around the rear cap rim to the under-cap gill sector where the spores originated.
Spore motion becomes slightly more coherent around the active initiative: particles appear between gills, travel laterally, curl around the rim, and join the upward plume without becoming a particle fountain.
The three exits reveal sequentially during the orbit, then remain visible together at the resting pose. They stay distinct but clearly draw from the same gill network and shared airflow around the same organism.
Each plume contains multiple velocities and particle sizes; some spores drop, some circle briefly, and others are carried upward, preventing a clean synthetic emitter shape.
The cap surface carries a faint travelling bioluminescent flow. A restrained anamorphic streak may appear only on the currently active release point.
## Transition to Connect
After the three release regions are established, the camera selects one plume as a visual guide and follows its movement backward and downward around the cap rim. The open sky is gradually occluded by the cap as the camera slips into the under-cap gill chamber. This is the first major threshold in the current extension and a natural opportunity to stream Connect assets while preserving continuity.
CHAPTER 3
# Connect — the commons beneath the cap
The radial gills are the architecture of the chamber. Shorter secondary gills and fine cross-veins or anastomosing tissue connect neighbouring channels, creating a biologically grounded commons rather than an arbitrary digital web.
[[IMAGE: image12.png]]
Connect: cross-veined gills and living junctions make Community, ADOS, and Hivemind anatomically concrete.
## Approved copy direction
Heading: “Connect the ecosystem.”
Supporting copy: “Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art.”
## The three network behaviours
Community is the connected commons: multiple pillars and channels held together by the shared lattice.
ADOS is convergence: distant strands bend toward a bright knot where online relationships become real collaboration.
Hivemind is persistence: a braided route and memory structure that keeps discoveries useful and searchable.
## Micro-interactions
Hovering Community illuminates a real region: several neighbouring gills, shorter secondary gills, and their cross-veins brighten in sequence rather than pointing to empty space.
Hovering ADOS sends pulses from distant gill channels into one convergence knot, followed by a small outward afterglow suggesting a real gathering that changes the surrounding network.
Hovering Hivemind traces a persistent braided route and reveals small fading memory-points along it; the trail remains faintly visible after the primary pulse passes.
Clicking a named element opens a restrained information card or drawer while retaining the chamber view.
Gill edges flex almost imperceptibly in local airflow while spores drift between the lamellae and migrate toward the cap margin.
The chamber never pulses as one object. Independent regions exchange light asynchronously, preserving the feeling of a large living commons.
## Transition to Owned
A pulse travels from the commons toward the stipe-cap junction. The camera follows the structure laterally, exits the chamber near the stipe, and descends along the organism’s exterior or shallow surface. It must not enter the deferred Equip interior. The camera then crosses the soil-line and levels into the underground ownership field.
CHAPTER 4
# Owned — the people-powered mycelial mat
Owned is the final substantive chapter and the conceptual reveal. The heading sits above a deep, densely connected mycelial field. A faint mushroom silhouette may sit behind the heading as a reminder of the organism above, but there is no separate above-ground scene. The visitor is unmistakably underground.
[[IMAGE: image14.png]]
Owned: a deep, irregular mycelial field containing many contributor nodes and a restrained ownership hierarchy.
## Approved public claims
100% shared — the dominant principle.
Granted 1% per month — a secondary explanation of gradual distribution over time.
Split between different groups — a secondary explanation, with artists, core engineers, and knowledge creators named beneath it.
## Visual hierarchy
The 100% shared pod is clearly primary, but it must not overwhelm the contributor network.
The two secondary pods are smaller and lower, with reduced emphasis but still sufficient legibility.
Many real contributor portraits are woven through the mycelium so ownership feels collective rather than abstract.
Portraits read as warm ember-nodes grown into the network, not profile cards pasted onto it.
## Micro-interactions
Hovering or focusing a person brightens their ember rim, brings the portrait slightly forward in depth, and illuminates only the local strands that actually connect to them.
Clicking a person opens a small profile card with name, role, and one or two sentences explaining their contribution and ownership relationship; the surrounding mycelium remains visible and active.
Hovering the primary ownership statement sends one broad, slow pulse through the full colony. The two secondary statements trigger smaller localized responses and remain visually subordinate.
Real people, names, photographs, and profile text require explicit consent before launch. Anonymous glowing nodes are the defined fallback.
Thicker rhizomorph-like cords carry slower waves while fine hyphae twinkle asynchronously; no single loop should be perceptible across the whole field.
Portraits occupy multiple depth planes. Foreground nodes pass softly out of focus during the glide, while distant nodes emerge from amber haze.
Dark substrate pockets and temporarily unlit regions are intentional; the underground network should never resemble a uniformly illuminated circuit board.
## Transition to the epilogue
A pulse leaves the ownership network and travels outward along the active mycelial growth front. The camera follows it, rises through the substrate, and tilts into an oblique cutaway that keeps both the surface fairy ring and the underground colony visible as the recession begins.
EPILOGUE
# Accelerate the second renaissance
The final scene is a long exhale shown from an oblique cutaway angle. A fairy ring and comparable fruiting bodies occupy the surface while the living mycelial colony remains visible beneath it. A broad, broken spore cloud disperses into the sky. The closing image reveals that visible growth and hidden infrastructure are one ecosystem becoming many.
[[IMAGE: image15.png]]
Final pullback: an oblique above-and-below-ground cutaway reveals a fairy ring, the living mycelial colony beneath it, and spores dispersing into the sky.
## Approved copy direction
Heading: “We’re working to accelerate the second renaissance.”
Supporting copy: “Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many.”
## Motion and composition
The camera keeps receding and tilting through an oblique cutaway; it does not settle into another detailed product view.
The soil-line crosses the composition on a slight diagonal, allowing the surface fairy ring, forest horizon, underground colony, and upper spore field to share the frame without dead space.
Foreground, midground, and background mushrooms create depth around an irregular fairy ring; several mature fruiting bodies share emphasis and no single mushroom reads as a parent organism.
Spores rise from multiple under-caps and merge into a broad, broken atmospheric cloud with one dominant drift direction and many particles peeling away independently.
This epilogue is not a peer chapter in the nav. The Owned nav state can remain active while the journey resolves.
## Micro-moments in the final pullback
A slow pulse travels around the active underground growth front. Fruiting bodies along the ring brighten in sequence rather than appearing simultaneously.
A few tiny primordia can become visible during a long hold, but any growth is subtle and time-compressed rather than a theatrical sprouting animation.
Above ground, under-cap spore release accumulates into a broad atmospheric cloud. Turbulence separates it into eddies, drifting clusters, and isolated points that continue into the sky.
Below ground, fine hyphae brighten locally as the camera passes while a few thicker cords carry slower travelling waves outward.
Forest mist, shallow depth-of-field changes, and foreground soil parallax support the documentary lens without competing with the final statement.
Hovering or focusing the CTA sends a single pulse around part of the fairy ring and briefly reveals the relationship between the surface fruiting bodies and the colony beneath.
MOTION SYSTEM
# Ambient life, micro-interactions, and chapter transitions
## Ambient layer
Continuous, low-amplitude, randomized motion: local transport pulses, fibre drift, spore movement, moisture response, depth haze, and network twinkle. Global synchronized breathing is prohibited.
Nothing ambient should move quickly enough to compete with hover, focus, selection, or camera travel. Interaction responses temporarily dominate the local ambient layer, then release back into it.
The visual feeling is biological and documentary-like: irregular, causal, and observed through a lens; never bouncy, metronomic, or game-like.
## Micro-interaction layer
Immediate but soft feedback for hover, focus, selection, and click.
Responses should reveal real structure and causality: transport fibres, gill regions, convergence routes, memory trails, local contributor strands, or the underground growth front.
Focus states are visually equivalent to hover states. Nothing meaningful exists only behind hover.
## Travel layer
Camera progress follows the journey continuously and reversibly.
Large text and detailed overlays may fade during major travel, then re-anchor at the next resting pose.
Fast scrolling takes the same accelerated continuous path; it must not expose unrelated frames or hard cuts.
A detail state closes before broader travel resumes.
## Micro-motion matrix
| Chapter | Ambient life | Interaction response | Transition cue |
| Mission | Preserve the implemented hero’s irregular mycelial pulses, under-cap drift, moisture glints, and documentary depth. | The current CTA and chrome retain their existing behaviour; one restrained flow can bias attention toward the cap before travel begins. | The camera begins its rear-cap orbit from the current resting pose without a visual reset. |
| Inspire | Under-cap release, rim circulation, three turbulent plume regions, faint cap-surface flow. | Hover or focus coheres one plume and traces it back to its real gill origin; exits reveal sequentially during arrival. | One plume becomes a guide back beneath the rim into the Connect chamber. |
| Connect | Asynchronous regional pulses, slight gill response, spores migrating toward the rim. | Community reveals a region; ADOS converges; Hivemind preserves an after-trace. | The camera moves toward the stipe junction and begins the exterior descent. |
| Owned | Slow waves in thick cords, fine asynchronous twinkle, portrait depth parallax, dark substrate pockets. | Person hover lights local strands; the primary ownership state sends the broadest network response. | One outward growth-front pulse leads toward the soil-line and final cutaway. |
| Final | Sequential ring activation, diffuse spore cloud, forest mist, above/below-ground parallax. | The CTA reveals one connected arc of fruiting bodies and the colony beneath. | The motion resolves into continuous recession rather than another chapter state. |

| Micro-motion rule
Every movement should answer one of three questions: what is being transported, what structure is being connected, or what environmental force is acting on the organism. Motion that cannot answer one of these questions is probably decorative and should be removed. |

| Motion references
Before production tuning, select two or three reference clips that demonstrate the intended camera character: slow, assured, spatial, documentary-like, and never bouncy. One named taste owner should make the final motion and look calls. |


PRODUCT BEHAVIOUR
# Navigation, routing, and state
Persistent chapter navigation for the current phase: Mission · Inspire · Connect · Owned. The active chapter is softly highlighted. Equip is not shown as an active destination in this phase.
The existing Explore the ecosystem CTA advances from Mission directly to Inspire. The persistent 2RP and Discord destinations remain unchanged.
Persistent paired destination control: 2RP and Discord. These are not a conversion funnel; they are stable ecosystem destinations.
Chapter navigation flies the camera along the spatial route rather than loading a separate page.
Every chapter and meaningful detail state has a shareable URL.
Landing on a deep link places the camera at the relevant resting pose and opens the relevant detail state without replaying the entire journey.
Browser Back closes a detail state before moving to a previous chapter state.
Manual scroll cancels a nav-triggered camera flight and immediately returns control to the visitor.
A conventional footer follows the epilogue with plain-text links, social links, contact, legal, and an accessible crawlable index of the content.
MOBILE AND ACCESSIBILITY
# First-class parallel experience
Every chapter receives a deliberate portrait camera pose; the desktop frame is not merely squeezed.
On touch, first tap focuses a node and reveals the desktop hover state; second tap opens the detail state.
Desktop drawers become bottom sheets on mobile, with internal scrolling and drag-to-dismiss behaviour.
Named nodes remain. Decorative density may be reduced to preserve clear 44px minimum touch targets.
The canvas is presentational and aria-hidden. Real DOM headings, copy, controls, drawers, profiles, and links create the accessible document.
Keyboard order follows the narrative. Enter opens, Escape closes, and focus returns to the triggering control.
prefers-reduced-motion receives a complete static journey using chapter stills, no ambient animation, and no parallax.
Functional gold-on-black text must meet WCAG AA; decorative glow does not substitute for readable contrast.
FEASIBILITY
# Can this be built convincingly in Three.js?
Yes. The extension is feasible as a real-time Three.js experience, and starting from an implemented hero reduces uncertainty. The current phase avoids the most overdraw-heavy stipe interior by deferring Equip. The main new technical challenges are preserving the existing hero while adding a controlled rear-cap orbit, authored three-point spore release, the Connect chamber, the Owned portrait field, and the final cutaway.
## Scene-by-scene feasibility
| Scene | Relative difficulty | Primary risk |
| Mission — existing baseline | Integration / regression risk | Accidentally changing the accepted hero, initial bundle, camera pose, optics, or performance while extending it. |
| Inspire — first extension | Moderate | A controlled rear-cap orbit, sequential discovery of three exits, and biologically credible under-cap spore origins without generic particle fountains. |
| Connect | Moderate–hard | Radial gills are efficient; the transverse lattice, semantic hotspots, and DOM anchoring require care. |
| Owned | Hardest look-development problem | Real photographic portraits must feel grown into the mycelium rather than pasted on as sprites. |
| Final pullback | Moderate | The oblique terrain cutaway, above/below-ground continuity, forest atmosphere, and broad spore cloud require compositing and LOD work. |

The implementation plan should therefore allocate prototyping effort according to risk rather than treating every chapter as equally difficult.
## Why the current extension is technically favourable
The first extension reuses the existing exterior mushroom and reveals its back side rather than requiring an immediate new microscopic environment. New rear-cap, gill-source, and plume assets can remain unloaded until the implemented hero is stable.
The Connect chamber is naturally suited to instanced radial blades, line geometry, sprites, and a repeating transverse lattice; the cap rim also provides strong occlusion for scene-cluster handoff.
Spore release is a conventional GPU particle problem and can scale cleanly across performance tiers.
Contributor portraits can use billboarded image planes, but the treatment requires dedicated look development: circular masks, warm colour grading, emissive fibre rims, strand geometry that visibly terminates at each node, and enough depth variation to prevent the portraits from reading as pasted-on UI.
The final fairy ring can use instanced mushrooms with controlled variation and aggressive distance level-of-detail.
Threshold crossings provide natural occlusion moments for streaming, level-of-detail changes, and scene-cluster handoffs.
## Recommended technical direction — not a rigid mandate
Real-time WebGL is the preferred primary experience. Scrubbed video is poorly suited to reversible scrolling, interactive nodes, deep links, and arbitrary detail states.
React Three Fiber with drei is a strong baseline because scene state, DOM state, drawers, routing, focus, and accessibility must remain coordinated. Raw Three.js is still acceptable if the team prefers it.
Use one logical world with chapter clusters arranged along a coherent camera path. The clusters do not have to be one literal mesh.
Make camera progress a function of one canonical journey state, ideally scroll progress. Nav clicks and deep links should move that state rather than independently commanding the camera.
Use custom line and particle shaders, instancing, sprites, baked noise or glow textures, selective bloom, and restrained fog. Avoid relying on many expensive transparent meshes.
Treat look development as an explicit approval milestone before production architecture is locked.
## The largest risks
Expectation gap: the generated stills have photographic and painterly glow that real-time rendering will interpret rather than exactly reproduce.
Motion tuning: scroll, trackpad, touch, snap behaviour, and camera easing can become unbounded without a named taste owner and timeboxed review sessions.
Transparency and overdraw: thousands of additive strands and spores can become expensive, particularly on mobile.
DOM/canvas synchronization: text, focus, routes, camera state, and detail state must share one source of truth.
Tier 3 drift: static fallback captures must be part of CI from the prototype stage rather than created manually at launch.
## Two separate look-development approvals
Extension look-development spike: begin from the implemented Mission scene, prove that its current material and documentary-optics identity survives the rear-cap orbit, and validate the Inspire plume treatment plus one dense Connect frame. The extension should inherit the existing lens rather than redefine it.
Owned portrait spike: prove that real contributors feel embedded in the mycelial field through colour grading, fibre-rim shaders, strand endpoints, depth scatter, hover emphasis, and realistic portrait density.
The acceptance test for Owned is qualitative but clear: the people must feel grown into the network, not like profile cards floating over it.
## Scroll model to validate in the grey-box prototype
Use scrubbed travel with soft chapter rests: camera progress remains reversible and directly tied to journey progress, while each chapter has a stable reading and interaction region.
Exact scroll distance per chapter, transition length, and snap magnetism are tuning decisions, but they must be resolved intentionally in the prototype rather than discovered during production.
Chapter copy is real DOM. It remains stable at resting poses, fades and releases during major travel, and reappears only when the next camera composition has created appropriate negative space.
In-world labels may remain projected from 3D positions, but large editorial copy should not visibly slide around while the camera makes a major move.
Reverse scrolling must be tested explicitly through the Inspire → Connect → Owned sequence so the rear-cap orbit, under-cap move, and stipe-side descent remain coherent when played backwards.
## Interaction depth by chapter
Mission receives no new product detail layer. Its current interactions remain the baseline, with the existing CTA now handing off to Inspire.
Inspire initiatives receive compact project spotlights with a summary, current status where relevant, and a primary external link.
Connect elements receive lighter contextual cards for Community, ADOS, and Hivemind.
Owned contributors receive short profile cards; ownership pods receive explanatory states rather than product-style drawers.
The Final pullback has no deep detail state. It functions as the emotional epilogue.
## Clarifications that override mockup ambiguity
Equip and Astrid are deferred. They should not appear in the active navigation, routes, journey state, preload graph, current performance budget, or current acceptance criteria.
The persistent 2RP control opens the publication directly. The 2RP node in Inspire first opens a contextual spotlight explaining its role, with a clear link to the publication.
On mobile, Owned does not render every portrait as a simultaneous 44px target. The scene may show a curated spatial subset while a bottom-sheet index provides the complete accessible contributor list.
During the Final pullback, Owned remains the active navigation chapter because the final scene is an epilogue and consequence of ownership rather than a sixth peer chapter.
IMPLEMENTATION PRIORITIES
# Rendering strategy and fidelity hierarchy
The implementation should concentrate fidelity where it affects the perception of one living organism. The following strategy is directional rather than prescriptive: the technical lead may choose different geometry, shader, or scene-management techniques provided the same perceptual result and performance discipline are achieved.
| Scene | Recommended rendering approach | Main fidelity risk |
| Mission — existing baseline | Preserve the current scene graph, materials, lighting, camera pose, post-processing, DOM layer, and loading path. Add only the journey handoff and hidden rear-cap extension hooks required for the next chapter. | Regression: the extension must not make the current hero slower, visually different, or less stable. |
| Inspire | Reuse the current mushroom exterior; add rear-cap / under-cap source geometry, authored airflow fields, three controlled plume regions, and a camera orbit spline beginning at the existing pose. | A decorative spin, cap-top fountains, or three generic emitters that do not feel tied to the gills. |
| Connect | Instanced radial gills, shorter secondary gills, restrained cross-veins, and a small number of semantic paths tied to Community, ADOS, and Hivemind. | The chamber becoming tangled gold noise or losing the distinction between the three behaviours. |
| Owned | Camera-facing portrait planes with warm grading and masks, emissive fibre rims, true local strand geometry, depth scatter, and irregular substrate. | People looking pasted onto a background rather than grown into the network. |
| Final | Instanced mushrooms with variation and LOD, irregular terrain and soil cutaway, layered underground colony, and broad dispersed spore volume. | The cutaway feeling like a clean diagram rather than an inhabited fungal landscape. |

## Fidelity hierarchy when trade-offs are required
Preserve the perception of one continuous spatial journey.
Preserve readable, responsive interactions and complete information.
Preserve the documentary-optics identity and coherent grade.
Preserve convincing hero structures close to the camera.
Preserve the feeling that ownership portraits are embedded in the mycelium.
Reduce ambient strand and particle density before compromising any of the above.
## Where to spend disproportionate effort
Inspire should receive the largest particle-flow and camera-orbit budget in the first extension because it is the first proof that the current hero can grow into a journey without a reset.
Owned should receive the largest compositing and art-direction budget because portrait integration has the widest gap between acceptable and cheap-looking.
The chapter transitions should receive the largest motion-design budget because continuity is the central product promise.
## Thresholds as technical opportunities
The current extension uses the rear-cap reveal, the move beneath the cap, and the soil-line crossing as deliberate scene-management opportunities. When the cap or substrate fills the frame, the implementation may invisibly simplify or stream the world while preserving perceptual continuity.
Stream the next chapter cluster and retire distant high-detail geometry.
Exchange full geometry for impostors or lower levels of detail.
Change fog, lighting, particle fields, and post-processing parameters.
Reallocate the strand and transparency budget toward the chapter the camera is entering.
## Current-extension regression and performance gate
The first extension approval must record the implemented hero baseline and the extended Inspire state: initial bundle weight, time-to-interactive, GPU frame time at the Mission pose and during the orbit, plume particle cost, transparent-layer count, and results on agreed reference devices. The hero may not silently regress merely because later chapters exist.
VISUAL FINISHING
# Documentary optics — the project’s lens
The organism should feel observed through a physical lens rather than displayed directly from a framebuffer. This is not a decorative filter applied after the scene is finished. It is the project’s finishing language and must be established during the first look-development milestone because it changes brightness, density, fog, contrast, and material decisions throughout the scene.
| Desired perceptual result
Filmed bioluminescence: biological, documentary-like, warm, imperfect, and optically coherent. The real-time result should interpret the approved stills through this lens rather than mimic painterly illustration with a heavy stylization filter. |

## The core optics stack
Selective warm halation: Use warm, slightly asymmetric red-orange bleed around the hottest light sources instead of uniform digital bloom. Apply it selectively to focal sources such as the hero rim, active Inspire exits, ADOS convergence, the primary ownership state, and selected fairy-ring highlights.
Luminance-weighted fine grain: Use fine animated grain that is strongest in shadows and midtones and suppressed in bright cores. It should remove perfect-gradient digital polish, conceal dark-scene banding, and remain subtle enough not to advertise itself as an effect.
Restrained radial aberration and vignette: Use tiny edge-weighted RGB separation and a soft vignette to imply a lens and guide the eye. Keep the centre, active interaction areas, and all text-adjacent regions optically clean.
LUT-driven colour grade and highlight roll-off: Lift the blacks into a warm near-black, preserve colour in ember cores rather than clipping to white, and maintain a consistent amber-led grade with only restrained cool accents. The taste owner should be able to grade a reference frame and update the experience through a 3D LUT.
## Depth and the optional signature move
Warm depth-based atmospheric scattering: Treat faint amber fog and depth dissolution as part of the core scene language. Nearby strands remain sharp and hot; middle-distance fibres soften into ember haze; distant structures dissolve gradually instead of disappearing into pure black. This is especially important inside Equip, beneath the cap, and in the Owned field.
Authored anamorphic streaks: Horizontal flare may be used on a very small, explicitly authored set of the brightest sources, especially the active Inspire exit, ADOS convergence, or a selected ownership node. It must remain rare enough to feel like a lens catching an exceptional source.
## Rendering tiers and accessibility
Tier 1 carries the complete lens: LUT and highlight roll-off, luminance-weighted animated grain, selective halation, subtle radial aberration, vignette, warm atmospheric scattering, and authored streaks where approved.
Tier 2 preserves the grade identity first: LUT, highlight roll-off, lightweight grain, warm depth fog, and a reduced or baked glow treatment. Continuous aberration and streaks may be removed.
Tier 3 stills are captured with the complete approved finishing stack baked into the image; all interface and detail behaviour remains functional in DOM.
For prefers-reduced-motion, freeze grain to a static frame rather than removing it, preserving the anti-banding and texture benefit without visible motion.
## Interface and annotation boundary
Editorial copy, persistent navigation, buttons, drawers, profile cards, and functional labels remain real DOM above the post-processed canvas.
In-world annotations should preferably be DOM elements projected from 3D positions. They must not be degraded by aberration, low-resolution composites, grain, or highlight bloom.
The post-processing pipeline must never become an excuse for weak contrast or unreadable UI. Accessibility and information integrity remain the highest priority.
## Look-development workflow
Develop and approve the lens during the first organism material-language spike, before downstream asset brightness and density are locked.
Provide a permanent one-key raw-versus-finished debug toggle so the taste owner and technical team can compare the unprocessed scene with the approved lens throughout development.
Approve the implemented Mission frame, the rear-cap Inspire resting pose, and one dense Connect or Owned frame through the same grade to prove that the existing finishing language remains coherent across the extension.
Exact shader passes, render targets, LUT implementation, halation technique, and performance strategy are delegated technical decisions; the perceptual outcome and tier identity are fixed direction.
## Directions intentionally rejected
| Direction | Verdict for this project |
| Documentary optics | Approved direction. Amplifies the existing organism rather than competing with it. |
| Ordered dithering / Bayer | Reject. Too computational and retro; fights the organic softness. |
| CRT / scanline | Reject. Suggests machinery and retro technology rather than biology. |
| Watercolour / paper overlay | Do not use as a screen-space treatment; it risks a static screen-door effect while the 3D world moves behind it. |
| Kuwahara / oil-paint filtering | Not for the live experience. It smears the fine strands and risks legibility, though it may be explored separately for non-interactive promotional imagery. |
| Heavy VHS / glitch | Reject. Contradicts the slow documentary motion language. |

| Feasibility conclusion
The concept is not only feasible; the mushroom anatomy improves feasibility. Interior occlusion, radial repetition, particle-friendly spores, billboard portraits, instanced fairy rings, and natural threshold moments all create practical opportunities for performance management. |


DELIVERY TIERS
# A shared identity across three capability levels
Tier 1 — full real-time experience: complete particle density, post-processing, continuous scrubbed camera, desktop-class devices.
Tier 2 — lightweight WebGL: reduced particle density, simpler shaders, baked glow sprites, mobile and older laptops.
Tier 3 — static journey: chapter stills with CSS crossfades plus complete HTML navigation, drawers, profiles, and links. Used for reduced motion, failed capability detection, or WebGL initialization failure.
## Performance direction
Aim for a sustained 60fps on an M1-class MacBook Air for Tier 1 and a recent mid-range Android device for Tier 2.
Preserve the current Mission headline and core DOM timing. The extended chapters should become available progressively without increasing the existing hero’s time-to-interactive beyond the agreed regression budget.
Lazy-load chapters beyond the hero while the visitor reads the opening.
Use a runtime performance watchdog to simplify Tier 1 into Tier 2 when necessary. Do not live-swap from WebGL to static unless WebGL fails.
Generate Tier 3 captures automatically from the live scene at build time so fallbacks remain synchronized.
## Look-development performance budgets
Set and record a hard strand, particle, and transparency-overdraw budget for each delivery tier during look development; do not wait until production profiling.
Use true high-density strand geometry only near the camera. Far fibres should use baked glow, simplified curves, sprites, or lower-resolution composite layers.
Render strand and particle layers to a reduced-resolution buffer where useful, then composite them back into the main frame.
Apply bloom selectively to hero fibres and focal nodes rather than globally increasing glow until the frame matches the still.
Treat 60fps on an M1-class MacBook Air as the Tier 1 reference and 60fps on an agreed mid-range Android as the Tier 2 target. A 30fps mobile fallback requires explicit approval rather than silent acceptance.
LOADING
# Preserve the implemented Mission loading experience
Do not replace or redesign the current Mission loading sequence as part of this extension. Its existing visual behaviour, fallback path, and first meaningful render remain the baseline.
Load the new Inspire, Connect, Owned, and Final assets after the implemented hero is stable, using chapter-level streaming and the cap / soil occlusion moments where useful. New chapter loading must not delay the existing hero.
The existing headline, navigation, and CTA remain immediately available as real DOM and must not wait for the extension assets.
Preserve the current WebGL failure and static-fallback behaviour. Extend the fallback with the new chapter stills without changing the accepted Mission failure path.
CONTENT OPERATIONS
# Maintainable content and real people
No manually maintained activity numbers. A live module either uses an automated source and freshness rule or does not ship.
Any live module whose source has not updated within the agreed freshness window hides itself automatically.
Every ownership portrait requires explicit opt-in covering image, name, role, and profile copy.
Contributor profiles use a structured content model so people can be added, updated, or removed without redesigning the chapter.
The same content source should govern node labels, accessible text, routes, drawers, profiles, footer entries, and fallback metadata to avoid drift.
Assign named owners for drawer copy, activity feeds, contributor profiles, consent records, and public links before launch.
KEY DESIGN ARTIFACT
# The mushroom anatomy map
Before production scene work, create one two-page spatial narrative map. It is not a technical coordinate specification; it is the agreed spatial truth that prevents the project from becoming six unrelated scenes.
## Page 1 — anatomy and topology
The current implemented Mission organism in one view, plus the rear cap and under-cap release regions, radial and secondary gills, cross-veins, stipe exterior, soil-line, irregular mycelial colony, active fairy-ring growth front, and final above/below-ground cutaway.
Physical placement of Arca Gidan Prize, ArtCompute, 2RP, Community, ADOS, Hivemind, the ownership pods, and contributor portraits. A clearly marked reserved area may note Equip as deferred, but it is not part of the current path.
Visual connectors showing which structures grow from or feed which others, including under-cap spore origins, paths around the rim, and the outward mycelial growth front that produces the fairy ring.
The current-phase reveal and thresholds clearly identified: the rear-cap discovery, the move beneath the cap, and the soil-line crossing.
## Page 2 — camera journey
Five active resting poses: Mission, Inspire, Connect, Owned, and Final pullback. Equip is excluded from the current camera path.
The continuous camera path and its dominant movement in each chapter.
Landscape and portrait framing intention for every pose.
Entry movement, exit movement, text position, and any intentional occlusion / streaming opportunities. The resting-composition and movement matrices in this brief are the reference inputs for this page.
DELIVERY PLAN
# Prove the difficult parts first
1. Audit and freeze the implemented Mission hero as the regression baseline: screenshots, camera pose, renderer settings, post-processing, DOM behaviour, bundle weight, and frame time.
2. Update the mushroom anatomy and camera map for the current phase: Mission → Inspire → Connect → Owned → Final, with Equip explicitly deferred.
3. Build the first extension from the current hero into Inspire: controlled rear-cap orbit, slight push-in, sequential discovery of three exit points, and the complete spore-origin / rim-flow treatment.
4. Grey-box Inspire → Connect → Owned, proving the move under the cap, the gill commons, the stipe-side descent, and the soil-line threshold without entering the deferred Equip interior.
5. Run the separate Owned portrait look-development spike, then build the contributor field and ownership interactions at production-equivalent density.
6. Add the Final pullback, mobile interaction model, reduced-motion path, and Tier 3 capture pipeline while preserving the current hero’s initial performance.
7. Lock the expanded scene architecture only after the existing hero remains stable and the Inspire-first continuation, portrait treatment, scroll mechanics, and continuity feel are accepted.
## Prototype acceptance criteria
Fast end-to-end scrolling never exposes a cut or unrelated frame.
Scrolling upward retraces the spatial journey cleanly.
A direct URL opens the correct chapter and detail state.
Back closes the detail state before leaving the chapter.
Manual scroll cancels a nav-triggered flight without camera disagreement.
The implemented Mission hero renders and behaves as before; the extension does not materially regress its visual fidelity, loading, accessibility, or performance.
The rear-cap orbit, under-cap entry, and soil-line crossing feel spatially continuous rather than like cuts or unrelated scenes.
Tier 2 retains the same identity with reduced richness.
Tier 3 communicates every piece of information without WebGL.
The accepted real-time look is clearly understood as the implementation fidelity baseline.
The Owned portrait sample passes the embedded-not-pasted test at realistic density and in motion.
The prototype makes an explicit decision on scrub distance, soft-rest behaviour, text pinning/fading, and transition allocation.
The Inspire → Connect → Owned sequence remains legible, appropriately paced, and acceptable in both scroll directions.
Inspire is unmistakably the second chapter: the current hero continues directly into the rear-cap orbit, with no Equip stop, route, preload, or scroll allocation.
Owned remains usable on touch without requiring dozens of overlapping portrait hit targets.
The resting compositions and dominant movement directions remain legible against the agreed camera matrix, while exact coordinates and scroll distances are resolved in prototype.
The approved documentary-optics lens visibly reduces the clean particle-demo quality without obscuring strand detail or becoming an obvious stylization effect.
The raw-versus-finished debug toggle is available from the first look-development build onward.
DOM text and projected functional annotations remain crisp and unaffected by canvas aberration, grain, reduced-resolution composites, or halation.
Tier 2 and Tier 3 preserve the same grade identity even when the richer optical passes are reduced or baked.
The Hero and Final never read as tree roots: the fruiting bodies emerge from a pre-existing, wider mycelial colony.
The three Inspire exit regions reveal sequentially, remain spatially distinct, and visibly originate beneath the cap rather than from the cap top.
Inspire spores visibly originate beneath the cap, travel around the rim, and then rise; no plume behaves like a fountain emerging directly from the cap top.
Ambient motion uses randomized phase and local causality; the full organism never breathes or pulses in perfect synchrony.
The Final cutaway simultaneously communicates the surface fairy ring, the active underground growth front, and a broad dispersed spore cloud without producing dead compositional space.
DEFERRED FUTURE PHASE
# Equip and Astrid are retained, but not in the current build
The approved Equip, PYPE, Arnold, Astrid, and Astrid detail concepts remain available for a later phase. They are intentionally excluded from the current active journey so the team can extend the implemented hero directly into Inspire and prove the continuous experience with less scope.
Do not show Equip in active navigation, allocate scroll distance to it, preload its assets, implement its routes or drawer, or retain obsolete acceptance criteria merely because earlier mockups included it.
Do not add speculative abstraction or procedural complexity solely to make future Equip insertion easy. Future expansion remains desirable, but it should not weaken the current Inspire-first delivery.
If Equip is reintroduced, treat it as a separately approved extension with a new camera-path decision. The current phase must continue to define Inspire as the second chapter.
DECISION BOUNDARY
# Decisions intentionally delegated to the technical lead
Three.js application framework and state-management approach.
Exact scene decomposition, mesh / curve representation, shaders, particle techniques, asset formats, and the technical implementation of the approved documentary-optics lens.
Scroll library, camera spline authoring method, motion curves, and duration tuning.
The division between procedural generation and art-directed modelling.
CMS versus repository content, provided one maintainable source coordinates visible and accessible content.
Exact level-of-detail, capability detection, caching, streaming, and hosting architecture.
How much additional work is acceptable when future initiatives are added.
| The contract
The brief defines the world, the story, the spatial relationships, the interaction outcomes, the public claims, and what success feels like. The delivery team determines the strongest technical and production approach for making that experience real. |


HANDOFF CHECKLIST
# Ready for alignment
Approved current-phase chapter sequence: Mission → Inspire → Connect → Owned → Final, with Equip explicitly deferred.
Approved biologically grounded visual directions for the implemented Mission hero, Inspire, Connect, Owned, and the Final above/below-ground cutaway.
Explicit preservation boundary for the existing Mission implementation and additive extension approach.
Approved ownership claims and contributor-profile direction.
Approved navigation and persistent 2RP / Discord treatment.
Defined micro-interactions, chapter-specific micro-motion, environmental motion, and inter-chapter transitions.
Defined mobile, accessibility, reduced-motion, and fallback expectations.
Documented Three.js feasibility, current-phase scene risk and rendering strategy, fidelity hierarchy, Inspire-first camera path, regression gate for the implemented hero, resting-pose and transition matrices, portrait look-development gate, threshold scene-management opportunities, and documentary-optics finishing language.
Next required artifact: the revised five-pose mushroom anatomy / camera map, followed by the additive Mission-to-Inspire orbit prototype and the grey-box Inspire-to-Connect-to-Owned continuity test.
