/** Owns the paused WAAPI effects used to phase-lock copy rise to scene time. */
export function createArrivalMotion({ blocks, reduceMotion }) {
  function start(arrival) {
    const block = blocks[arrival.id];
    if (!block) { arrival.started = true; return; }
    void block.offsetWidth;
    block.classList.add('j-arrive');
    arrival.started = true;
    arrival.motions = [];
    if (reduceMotion.matches || typeof Element.prototype.animate !== 'function') return;

    const specs = [
      [block.querySelector('.j-h'), 0.12, 0.66],
      [block.querySelector('.j-sub'), 0.26, 0.66],
      ...[...block.querySelectorAll('.j-act')].map((element) => [
        element,
        parseFloat(getComputedStyle(element).getPropertyValue('--j-act-lead')) || 0.40,
        parseFloat(getComputedStyle(element).getPropertyValue('--j-act-dur')) || 0.52,
      ]),
    ];
    for (const [element, delayFraction, durationFraction] of specs) {
      if (!element) continue;
      element.style.animation = 'none';
      const motion = element.animate(
        [{ transform: 'translateY(0.16em)' }, { transform: 'translateY(0)' }],
        {
          delay: arrival.dur * delayFraction * 1000,
          duration: arrival.dur * durationFraction * 1000,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
        },
      );
      motion.pause();
      motion.currentTime = 0;
      arrival.motions.push({ el: element, motion });
    }
  }

  function sync(arrival) {
    if (!arrival.started || !arrival.motions) return;
    const phaseMs = Math.max(0, (arrival.t - arrival.lead) * 1000);
    for (const { motion } of arrival.motions) motion.currentTime = phaseMs;
  }

  function clear(arrival) {
    if (!arrival) return;
    for (const { el: element, motion } of (arrival.motions || [])) {
      motion.cancel();
      element.style.removeProperty('animation');
    }
    const block = blocks[arrival.id];
    if (block) block.classList.remove('j-arrive');
  }

  return { start, sync, clear };
}
