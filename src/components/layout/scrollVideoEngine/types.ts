// Page-agnostic types for the scroll-driven background video engine.
// Anything page-specific (chunk tables, section ids, master video timing)
// lives in the calling page's config, not here.

export type Track = {
  src: string;
  startAt?: number;
  endAt?: number;
  transform?: string;
  holdAtStartMs?: number;
  mode:
    // `speed` is the playback rate. When `speedEnd` is also provided, the rate
    // ramps linearly from `speed` to `speedEnd` across the play step's
    // wall-clock duration (only honored inside transition play steps).
    | { kind: 'play'; speed: number; speedEnd?: number }
    | { kind: 'freeze' }
    | { kind: 'loop' };
};

export type Stage = { track: Track; minDurationMs?: number };

export type Section = {
  id: string;
  stages: Stage[];
  /**
   * Stage used when this section is entered via an ordinary adjacent transition.
   * Defaults to 0.
   */
  entryStageIndex?: number;
  /**
   * Stage used when the user skips directly to this section. Defaults to
   * `entryStageIndex`, so jumps start the section's own video unless a page
   * explicitly asks for a settled frame instead.
   */
  jumpStageIndex?: number;
  /**
   * Stage that represents the section after its entry motion has completed.
   * Defaults to the final stage.
   */
  settledStageIndex?: number;
  /**
   * Stage to fast-forward toward before leaving a section. Defaults to
   * `settledStageIndex`.
   */
  catchUpStageIndex?: number;
  /**
   * Stage used by automatically synthesized reverse transitions. Defaults to
   * `entryStageIndex`.
   */
  reverseEntryStageIndex?: number;
  /**
   * Max playback rate (×) for the catch-up step that fast-forwards the rest video
   * when the user scrolls out before its drift completes. Default is the engine's
   * built-in `DEFAULT_CATCH_UP_MAX_SPEED` (set to feel rapid but not jarring).
   * Lower this for sections that look harsh when sped up.
   */
  catchUpMaxSpeed?: number;
};

/**
 * A `masterContinue` transition plays a slice of a "master" timeline (often a
 * long source video chunked into multiple files for streaming) between two
 * sections. The transition carries its own master-time range plus a
 * `resolveChunk` callback that maps a master time to a concrete `{ src, t }`
 * inside whatever chunk file actually holds that frame.
 *
 * When the requested range crosses a chunk boundary, the compiler also needs
 * to know where that boundary is in master-time so it can split the play step
 * into a play + crossfade across two chunk files. `resolveChunkEnd` returns
 * the master-time end of whichever chunk contains `masterStart`.
 *
 * Pages that never cross chunk boundaries can omit `resolveChunkEnd`.
 */
export type Transition =
  | {
      from: string;
      to: string;
      spec: {
        kind: 'masterContinue';
        durationMs: number;
        masterStart: number;
        masterEnd: number;
        resolveChunk: (t: number, direction: 'in' | 'out') => { src: string; t: number };
        resolveChunkEnd?: (masterStart: number) => number;
        // Optional linear speed ramp across the transition. When both are set,
        // the compiled play step's mode carries `{ speed: speedStart, speedEnd }`
        // and the engine interpolates per frame. Only valid for same-chunk
        // transitions today; cross-chunk + ramp throws at compile time.
        speedStart?: number;
        speedEnd?: number;
        // Honored only when the corresponding endpoint is an override; defaults to ~500ms.
        headCrossfadeMs?: number;
        tailCrossfadeMs?: number;
      };
    }
  | { from: string; to: string; spec: { kind: 'crossfade'; durationMs: number } }
  | { from: string; to: string; spec: { kind: 'cut' } };

export type SlotRole = 'active' | 'inactive';

export type CompiledTransitionStep =
  | { kind: 'play'; slot: SlotRole; track: Track; durationMs: number }
  | { kind: 'crossfade'; fromSlot: SlotRole; toSlot: SlotRole; track: Track; durationMs: number }
  | { kind: 'cut'; toSlot: SlotRole; track: Track; durationMs: 0 };

export type CompiledTransition = {
  from: string;
  to: string;
  steps: CompiledTransitionStep[];
};

export const transitionKey = (from: string, to: string) => `${from}->${to}`;
