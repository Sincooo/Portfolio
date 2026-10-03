/** Idle drift belongs to the SVGs; scroll movement belongs to their parent. */
export function initializeSeparators() {
  const separators = [...document.querySelectorAll<HTMLElement>('[data-section-separator]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<HTMLElement>();
  let frame = 0;
  const update = () => {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    // Batch geometry reads before writes. No continuous JavaScript animation loop.
    const positions = [...visible].map(element => ({ element, top: element.getBoundingClientRect().top }));
    positions.forEach(({ element, top }) => {
      const progress = Math.max(0, Math.min(1, (innerHeight - top) / innerHeight));
      element.style.setProperty('--separator-progress', progress.toFixed(4));
    });
  };
  const schedule = () => {
    if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(update);
  };
  const setPlayback = () => {
    separators.forEach(element => element.classList.toggle('is-drifting', visible.has(element) && !reduced.matches && !document.hidden));
    if (reduced.matches || document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const separator = entry.target.parentElement!;
        if (entry.isIntersecting) visible.add(separator);
        else visible.delete(separator);
      });
      setPlayback();
    }, { rootMargin: '100px 0px' });
    separators.forEach(element => observer.observe(element.querySelector('.separator-window')!));
  } else separators.forEach(element => visible.add(element));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', setPlayback);
  reduced.addEventListener('change', setPlayback);
  setPlayback();
}
