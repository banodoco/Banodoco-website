/** Continue the painted shell's fade on the live rail's compositor layer.
 * Sampling hero opacity in rAF held the rail still during shader preparation,
 * then jumped to the hero's newer opacity when the main thread caught up. */
export function continueRailEntry(root, shell, cancelled = () => false) {
  const fade = element => element?.getAnimations().find(animation => animation.animationName === 'fade-on');
  const source = fade(shell);
  root.style.setProperty('--rail-opacity-duration', '0s');
  root.style.opacity = '1';
  const finish = () => {
    root.style.removeProperty('--rail-opacity-duration');
  };
  const transfer = animation => {
    const copy = root.animate(animation.effect.getKeyframes(), animation.effect.getTiming());
    copy.id = 'rail-entry-handoff';
    if (animation.startTime !== null) copy.startTime = animation.startTime;
    else copy.currentTime = animation.currentTime ?? 0;
    copy.finished.then(() => {
      copy.cancel();
      finish();
    }, finish);
  };
  if (source) transfer(source);
  else if (document.body.classList.contains('hero-entry-pending') &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // The shared first-paint barrier has not opened yet. Wait only while
    // invisible, then inherit the hero animation's exact start time once.
    root.style.opacity = '0';
    const waitForEntry = () => {
      if (cancelled()) return finish();
      const hero = document.querySelector('h1 .hl');
      const animation = fade(hero);
      if (animation) {
        root.style.opacity = '1';
        transfer(animation);
      } else if (document.body.classList.contains('hero-entry-pending')) requestAnimationFrame(waitForEntry);
      else {
        root.style.opacity = '1';
        finish();
      }
    };
    requestAnimationFrame(waitForEntry);
  } else finish(); // Reduced motion, or an already-finished entry.
  shell.remove();
}
