let disposeSeparators: (() => void) | undefined;

/** CSS owns idle drift; this controller adds a short, bounded scroll response. */
export function initializeSeparators() {
  disposeSeparators?.();
  const separators = [...document.querySelectorAll<HTMLElement>('[data-section-separator]')];
  if (!separators.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<HTMLElement>();
  const listeners = new AbortController();
  const { signal } = listeners;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  let observer: IntersectionObserver | undefined;
  let frame = 0;
  let stopTimer = 0;
  let lastFrameTime = 0;
  let lastScrollTime = performance.now();
  let lastScrollY = scrollY;
  let geometryDirty = true;
  let suspended = false;
  let energy = 0;
  let response = 0;
  let targetEnergy = 0;
  let targetResponse = 0;

  const canAnimate = () => !reduced.matches && !document.hidden && !suspended && visible.size > 0;
  const resetResponse = () => {
    cancelAnimationFrame(frame);
    clearTimeout(stopTimer);
    frame = stopTimer = lastFrameTime = 0;
    energy = response = targetEnergy = targetResponse = 0;
    separators.forEach(element => {
      element.style.setProperty('--separator-energy', '0');
      element.style.setProperty('--separator-response', '0');
    });
  };

  const update = (time: number) => {
    frame = 0;
    if (!canAnimate()) return;
    const elapsed = Math.min(time - (lastFrameTime || time - 16), 64);
    lastFrameTime = time;
    const energyBlend = 1 - Math.exp(-elapsed / (targetEnergy > energy ? 120 : 420));
    energy += (targetEnergy - energy) * energyBlend;
    response += (targetResponse - response) * (1 - Math.exp(-elapsed / 180));
    const settling = Math.abs(targetEnergy - energy) + Math.abs(targetResponse - response) > .002;
    if (!settling) { energy = targetEnergy; response = targetResponse; }

    // Read all visible boundary geometry first, then write compositor transforms.
    const positions = geometryDirty ? [...visible].map(element => {
      const bounds = element.querySelector<HTMLElement>('.separator-window')!.getBoundingClientRect();
      return { element, progress: clamp((innerHeight - bounds.top) / (innerHeight + bounds.height), 0, 1) };
    }) : [];
    geometryDirty = false;
    positions.forEach(({ element, progress }) => element.style.setProperty('--separator-progress', progress.toFixed(4)));
    visible.forEach(element => {
      element.style.setProperty('--separator-energy', energy.toFixed(4));
      element.style.setProperty('--separator-response', response.toFixed(4));
    });
    if (settling) frame = requestAnimationFrame(update);
    else lastFrameTime = 0;
  };
  const schedule = () => {
    if (!frame && canAnimate()) frame = requestAnimationFrame(update);
  };
  const setPlayback = () => {
    const enabled = !reduced.matches && !document.hidden && !suspended;
    separators.forEach(element => element.classList.toggle('is-drifting', enabled && visible.has(element)));
    geometryDirty = true;
    if (!canAnimate()) resetResponse();
    if (reduced.matches) separators.forEach(element => element.style.setProperty('--separator-progress', '.5'));
    schedule();
  };
  const onScroll = () => {
    const time = performance.now();
    const delta = scrollY - lastScrollY;
    const speed = clamp(delta / clamp(time - lastScrollTime, 8, 64) * 1000, -1400, 1400);
    lastScrollY = scrollY;
    lastScrollTime = time;
    geometryDirty = true;
    if (!canAnimate()) return;
    // Amplitude nearly doubles at full energy; geometry stays inside the wave window.
    targetResponse = speed / 1400;
    targetEnergy = Math.abs(targetResponse);
    clearTimeout(stopTimer);
    stopTimer = window.setTimeout(() => {
      stopTimer = 0;
      targetEnergy = targetResponse = 0;
      schedule();
    }, 160);
    schedule();
  };
  const onResize = () => {
    lastScrollY = scrollY;
    lastScrollTime = performance.now();
    geometryDirty = true;
    targetEnergy = targetResponse = 0;
    schedule();
  };

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const separator = entry.target.parentElement as HTMLElement;
        if (entry.isIntersecting) visible.add(separator);
        else visible.delete(separator);
      });
      setPlayback();
    });
    separators.forEach(element => observer!.observe(element.querySelector('.separator-window')!));
  } else separators.forEach(element => visible.add(element));

  const dispose = () => {
    resetResponse();
    observer?.disconnect();
    listeners.abort();
    separators.forEach(element => element.classList.remove('is-drifting'));
    visible.clear();
    if (disposeSeparators === dispose) disposeSeparators = undefined;
  };
  disposeSeparators = dispose;
  addEventListener('scroll', onScroll, { passive: true, signal });
  addEventListener('resize', onResize, { passive: true, signal });
  addEventListener('pageshow', () => { suspended = false; onResize(); setPlayback(); }, { signal });
  addEventListener('pagehide', event => {
    if (event.persisted) { suspended = true; setPlayback(); }
    else dispose();
  }, { signal });
  document.addEventListener('visibilitychange', () => { onResize(); setPlayback(); }, { signal });
  document.addEventListener('astro:before-swap', dispose, { signal });
  reduced.addEventListener('change', setPlayback, { signal });
  setPlayback();
  return dispose;
}
