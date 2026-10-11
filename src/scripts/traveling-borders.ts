const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

type BorderState = {
  card: HTMLElement;
  svg: SVGSVGElement;
  paths: SVGPathElement[];
  visible: boolean;
  hovered: boolean;
  focused: boolean;
  emphasis: number;
  phase: number;
};

let cleanupPrevious: (() => void) | undefined;

/** One small render loop serves visible borders; the existing card motion stays untouched. */
export function initializeTravelingBorders() {
  cleanupPrevious?.();
  const cards = [...document.querySelectorAll<HTMLElement>('.education-timeline .education-card, .project-showcase .project-folder')];
  if (!cards.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const events = new AbortController();
  const states: BorderState[] = [];
  let frame = 0;
  let previousTime = 0;
  let suspended = false;
  let destroyed = false;

  const canAnimate = () => !destroyed && !suspended && !document.hidden && !reduced.matches && !forcedColors.matches && states.some(state => state.visible);
  const schedule = () => { if (!frame && canAnimate()) frame = requestAnimationFrame(render); };

  function render(time: number) {
    frame = 0;
    if (!canAnimate()) { previousTime = 0; return; }
    const elapsed = previousTime ? time - previousTime : 1000 / 30;
    // Decorative borders need only 30 updates per second, even on high-refresh screens.
    if (elapsed < 1000 / 30) { schedule(); return; }
    const step = Math.min(elapsed, 64);
    const blend = 1 - Math.exp(-step / 280);
    previousTime = time;
    states.forEach(state => {
      if (!state.visible) return;
      const target = state.hovered || state.focused ? 1 : 0;
      state.emphasis += (target - state.emphasis) * blend;
      if (Math.abs(target - state.emphasis) < .001) state.emphasis = target;
      // A 20-second idle lap becomes a gentle 10-second lap while engaged.
      state.phase = (state.phase - step / 1000 * (5 + state.emphasis * 5) + 100) % 100;
      state.svg.style.setProperty('--border-stroke-phase', state.phase.toFixed(3));
      state.svg.style.setProperty('--border-stroke-opacity', (.42 + state.emphasis * .43).toFixed(3));
    });
    schedule();
  }

  const syncPlayback = () => {
    states.forEach(state => {
      state.svg.dataset.borderMode = reduced.matches ? 'static' : 'animated';
      state.svg.dataset.borderPlayback = canAnimate() && state.visible ? 'running' : 'paused';
    });
    if (canAnimate()) schedule();
    else { cancelAnimationFrame(frame); frame = previousTime = 0; }
  };

  const radius = (value: string, width: number, height: number): [number, number] => {
    const parts = value.split(/\s+/);
    const resolve = (part: string, size: number) => part.endsWith('%') ? parseFloat(part) / 100 * size : parseFloat(part);
    const x = resolve(parts[0], width);
    const y = resolve(parts[1] || parts[0], height);
    return [Math.max(0, Math.min(width / 2 - 3, x - 3)), Math.max(0, Math.min(height / 2 - 3, y - 3))];
  };

  const measure = (state: BorderState) => {
    const width = state.card.clientWidth;
    const height = state.card.clientHeight;
    if (width < 12 || height < 12) return;
    const style = getComputedStyle(state.card);
    const corners = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(value => radius(value, width, height));
    const [tl, tr, br, bl] = corners;
    const left = 3, top = 3, right = width - 3, bottom = height - 3;
    // Trace the actual asymmetric corners, rather than approximating them with an SVG rect.
    const arc = (r: [number, number], x: number, y: number) => r[0] > 0 && r[1] > 0 ? `A ${r[0]} ${r[1]} 0 0 1 ${x} ${y}` : `L ${x} ${y}`;
    const path = `M ${left + tl[0]} ${top} H ${right - tr[0]} ${arc(tr, right, top + tr[1])} V ${bottom - br[1]} ${arc(br, right - br[0], bottom)} H ${left + bl[0]} ${arc(bl, left, bottom - bl[1])} V ${top + tl[1]} ${arc(tl, left + tl[0], top)} Z`;
    state.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    state.paths.forEach(element => element.setAttribute('d', path));
  };

  cards.forEach((card, index) => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.classList.add('traveling-border');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('preserveAspectRatio', 'none');
    const paths = ['traveling-border__glow', 'traveling-border__stroke'].map(className => {
      const path = document.createElementNS(SVG_NAMESPACE, 'path');
      path.classList.add(className);
      path.setAttribute('pathLength', '100');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.append(path);
      return path;
    });
    card.append(svg);
    const state: BorderState = { card, svg, paths, visible: false, hovered: false, focused: card.matches(':focus-within'), emphasis: 0, phase: index * 19 };
    states.push(state);
    measure(state);
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      state.hovered = true;
      schedule();
    }, { signal: events.signal });
    const leave = () => { state.hovered = false; schedule(); };
    card.addEventListener('pointerleave', leave, { signal: events.signal });
    card.addEventListener('pointercancel', leave, { signal: events.signal });
    card.addEventListener('focusin', () => { state.focused = true; schedule(); }, { signal: events.signal });
    card.addEventListener('focusout', event => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      state.focused = false;
      schedule();
    }, { signal: events.signal });
  });

  const intersection = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.find(item => item.card === entry.target);
      if (state) state.visible = entry.isIntersecting;
    });
    syncPlayback();
  }) : undefined;
  if (intersection) states.forEach(state => intersection.observe(state.card));
  else states.forEach(state => { state.visible = true; });

  const resize = 'ResizeObserver' in window ? new ResizeObserver(entries => {
    entries.forEach(entry => {
      const state = states.find(item => item.card === entry.target);
      if (state) measure(state);
    });
  }) : undefined;
  if (resize) states.forEach(state => resize.observe(state.card));
  else addEventListener('resize', () => states.forEach(measure), { passive: true, signal: events.signal });

  document.addEventListener('visibilitychange', syncPlayback, { signal: events.signal });
  const resetHover = () => { states.forEach(state => { state.hovered = false; }); schedule(); };
  addEventListener('blur', resetHover, { signal: events.signal });
  reduced.addEventListener('change', syncPlayback, { signal: events.signal });
  forcedColors.addEventListener('change', syncPlayback, { signal: events.signal });
  finePointer.addEventListener('change', resetHover, { signal: events.signal });
  addEventListener('pagehide', event => {
    if (!event.persisted) cleanup();
    else { suspended = true; syncPlayback(); }
  }, { signal: events.signal });
  addEventListener('pageshow', () => { suspended = false; states.forEach(measure); syncPlayback(); }, { signal: events.signal });
  document.addEventListener('astro:before-swap', () => cleanup(), { signal: events.signal });

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    events.abort();
    cancelAnimationFrame(frame);
    frame = previousTime = 0;
    intersection?.disconnect();
    resize?.disconnect();
    states.forEach(state => state.svg.remove());
    if (cleanupPrevious === cleanup) cleanupPrevious = undefined;
  }

  cleanupPrevious = cleanup;
  syncPlayback();
  return cleanup;
}
