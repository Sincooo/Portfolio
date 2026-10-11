const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/** Scroll, pointer and idle movement each own a separate portrait wrapper. */
export function initializePortrait() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll<HTMLElement>('[data-profile-visual]').forEach(profile => {
    if (profile.dataset.portraitReady) return;
    profile.dataset.portraitReady = 'true';
    const scene = profile.querySelector<HTMLElement>('.profile-scene')!;
    const edge = profile.querySelector<SVGPathElement>('.profile-edge-highlight path')!;
    const events = new AbortController();
    const { signal } = events;
    let visible = false, suspended = false, disposed = false;
    let frame = 0, lastTime = 0, geometryDirty = true;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    let highlight: Animation | undefined;
    const canAnimate = () => visible && !suspended && !disposed && !document.hidden && !reduced.matches;
    const update = (time: number) => {
      frame = 0;
      if (!canAnimate()) return;
      const elapsed = lastTime ? time - lastTime : 16;
      lastTime = time;
      if (geometryDirty) {
        const bounds = scene.getBoundingClientRect();
        const top = bounds.top + scrollY;
        const start = Math.max(0, top + bounds.height * .5 - innerHeight * .5);
        const end = top + bounds.height * .85;
        scene.style.setProperty('--portrait-scroll', clamp((scrollY - start) / Math.max(1, end - start)).toFixed(4));
        geometryDirty = false;
      }
      const blend = 1 - Math.exp(-Math.min(elapsed, 64) / 95);
      x += (targetX - x) * blend;
      y += (targetY - y) * blend;
      const settling = Math.abs(targetX - x) + Math.abs(targetY - y) > .001;
      if (!settling) { x = targetX; y = targetY; lastTime = 0; }
      scene.style.setProperty('--portrait-x', x.toFixed(4));
      scene.style.setProperty('--portrait-y', y.toFixed(4));
      if (settling) schedule();
    };
    const schedule = () => { if (!frame && canAnimate()) frame = requestAnimationFrame(update); };
    const returnPointer = () => {
      targetX = targetY = 0;
      profile.classList.remove('is-engaged');
      schedule();
    };
    const syncPlayback = () => {
      profile.classList.toggle('is-animating', canAnimate());
      geometryDirty = true;
      if (canAnimate()) schedule();
      else {
        cancelAnimationFrame(frame); frame = lastTime = 0;
        x = y = targetX = targetY = 0;
        scene.style.setProperty('--portrait-x', '0'); scene.style.setProperty('--portrait-y', '0');
        profile.classList.remove('is-engaged'); highlight?.cancel();
        if (reduced.matches) scene.style.setProperty('--portrait-scroll', '0');
      }
    };
    const engage = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || !canAnimate() || profile.classList.contains('is-engaged')) return;
      profile.classList.add('is-engaged');
      const opacity = getComputedStyle(edge).opacity;
      highlight?.cancel();
      highlight = edge.animate([{ strokeDashoffset: '100', opacity }, { opacity: .85, offset: .2 }, { opacity: .5, offset: .7 }, { strokeDashoffset: '0', opacity: 0 }], { duration: 1450, easing: 'ease-in-out' });
    };
    profile.addEventListener('pointerenter', engage, { signal });
    profile.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || !canAnimate()) return;
      engage(event);
      const bounds = scene.getBoundingClientRect();
      targetX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      targetY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
      schedule();
    }, { passive: true, signal });
    profile.addEventListener('pointerleave', returnPointer, { signal });
    profile.addEventListener('pointercancel', returnPointer, { signal });
    const onScroll = () => { geometryDirty = true; schedule(); };
    addEventListener('scroll', onScroll, { passive: true, signal });
    addEventListener('resize', onScroll, { passive: true, signal });
    addEventListener('blur', returnPointer, { signal });
    addEventListener('pageshow', () => { suspended = false; syncPlayback(); }, { signal });
    document.addEventListener('visibilitychange', syncPlayback, { signal });
    reduced.addEventListener('change', syncPlayback, { signal });
    finePointer.addEventListener('change', returnPointer, { signal });
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback(); });
    visibility.observe(scene);
    const resize = new ResizeObserver(onScroll);
    resize.observe(scene);
    const cleanup = () => {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); highlight?.cancel();
      events.abort(); visibility.disconnect(); resize.disconnect();
      profile.classList.remove('is-animating', 'is-engaged'); delete profile.dataset.portraitReady;
    };
    addEventListener('pagehide', event => { if (event.persisted) { suspended = true; syncPlayback(); } else cleanup(); }, { signal });
    document.addEventListener('astro:before-swap', cleanup, { signal });
    syncPlayback();
  });
}
