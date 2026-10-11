import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Rebuild measurements ourselves so resizing preserves the current reading stage.
ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

type ReadingPosition = { stage: number; fraction: number; preserve: boolean };

export function initializeProjectSequence() {
  const showcase = document.querySelector<HTMLElement>('[data-project-showcase]');
  if (!showcase || showcase.dataset.sequenceInitialized) return;
  showcase.dataset.sequenceInitialized = 'true';
  const viewport = showcase.querySelector<HTMLElement>('[data-project-viewport]')!;
  const track = showcase.querySelector<HTMLElement>('[data-project-track]')!;
  const cards = [...showcase.querySelectorAll<HTMLElement>('[data-project-card]')];
  const contents = cards.map(card => card.querySelector<HTMLElement>('.project-folder-inner')!);
  if (!cards.length) return;
  const current = showcase.querySelector<HTMLElement>('[data-project-current]')!;
  const progress = showcase.querySelector<HTMLElement>('[data-project-progress]')!;
  const previous = showcase.querySelector<HTMLButtonElement>('[data-project-previous]')!;
  const next = showcase.querySelector<HTMLButtonElement>('[data-project-next]')!;
  const announcement = showcase.querySelector<HTMLElement>('[data-project-announcement]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let context: gsap.Context | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let trigger: ScrollTrigger | undefined;
  let active = -1;
  let scrollFrame = 0;
  let resizeTimer = 0;
  let resizeSnapshot: ReadingPosition | undefined;
  let handoffs: number[] = [];
  let readingEnds: number[] = [];
  const indexAtTime = (time: number) => handoffs.filter(handoff => time >= handoff).length;
  const sequenceTime = () => timeline?.time() ?? 0;

  const setActive = (index: number) => {
    index = gsap.utils.clamp(0, cards.length - 1, index);
    if (active === index) return;
    active = index;
    cards.forEach((card, position) => {
      const selected = position === active;
      // Covered links cannot steal focus. The controls and arrow keys reach every folder.
      const concealed = Boolean(timeline) && !selected;
      if (concealed && card.contains(document.activeElement)) viewport.focus({ preventScroll: true });
      card.inert = concealed;
      card.classList.toggle('is-active', selected);
      card.dataset.position = position < active ? 'before' : position > active ? 'after' : 'current';
      if (selected) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
    showcase.dataset.active = String(active);
    showcase.style.setProperty('--scene-accent', cards[active].dataset.accent || '#4f75ff');
    current.textContent = String(active + 1).padStart(2, '0');
    progress.style.transform = `scaleX(${(active + 1) / cards.length})`;
    previous.disabled = active === 0;
    next.disabled = active === cards.length - 1;
  };

  const scrollToTime = (time: number, instant: boolean) => {
    if (!timeline || !trigger) return;
    const top = trigger.start + (trigger.end - trigger.start) * time / timeline.duration();
    window.scrollTo({ top, behavior: instant || reduced.matches ? 'instant' : 'smooth' });
    if (instant) ScrollTrigger.update();
  };
  const go = (index: number, instant = false) => {
    index = gsap.utils.clamp(0, cards.length - 1, index);
    if (timeline && trigger) scrollToTime(timeline.labels[`project-${index}`] + 1, instant);
    else cards[index].scrollIntoView({ block: 'start', behavior: instant || reduced.matches ? 'instant' : 'smooth' });
    announcement.textContent = `Project ${index + 1} of ${cards.length}: ${cards[index].querySelector('h3')?.textContent}.`;
  };

  const readingPosition = (): ReadingPosition => {
    const bounds = showcase.getBoundingClientRect();
    const preserve = Boolean(trigger?.isActive) || (bounds.top < innerHeight * .5 && bounds.bottom > 96);
    if (!timeline) return { stage: Math.max(0, active), fraction: 0, preserve };
    const time = timeline.time();
    let stage = 0;
    cards.forEach((_, index) => { if (time >= timeline!.labels[`project-${index}`]) stage = index; });
    const start = timeline.labels[`project-${stage}`];
    const end = timeline.labels[`project-${stage + 1}`] ?? timeline.duration();
    return { stage, fraction: (time - start) / Math.max(1, end - start), preserve };
  };
  const restorePosition = (position: ReadingPosition) => {
    if (!timeline) { if (position.preserve) go(position.stage, true); return; }
    const start = timeline.labels[`project-${position.stage}`];
    const end = timeline.labels[`project-${position.stage + 1}`] ?? timeline.duration();
    if (position.preserve) scrollToTime(start + (end - start) * position.fraction, true);
  };

  const configure = (position?: ReadingPosition) => {
    context?.revert();
    context = timeline = trigger = undefined;
    showcase.classList.remove('is-scroll-sequence');
    ['--folder-height', '--folder-visible-height', '--stage-height', '--stack-headroom'].forEach(name => showcase.style.removeProperty(name));
    cards.forEach(card => { card.inert = false; });
    handoffs = [];
    readingEnds = [];

    if (cards.length > 1 && !reduced.matches && innerHeight >= 420) {
      const height = Math.max(...contents.map(content => content.offsetHeight));
      showcase.classList.add('is-scroll-sequence');
      showcase.style.setProperty('--folder-height', `${height}px`);
      const pinTop = Math.min(96, Math.max(16, innerHeight * .1));
      const bottomPadding = parseFloat(getComputedStyle(showcase).paddingBottom);
      const available = Math.max(120, innerHeight - pinTop - 18 - viewport.offsetTop - bottomPadding);
      const spacing = 24;
      const headroom = (cards.length - 1) * spacing + 40;
      const visibleHeight = Math.min(height, Math.max(100, available - headroom - 16));
      const stageHeight = headroom + visibleHeight + 16;
      showcase.style.setProperty('--stack-headroom', `${headroom}px`);
      showcase.style.setProperty('--folder-visible-height', `${visibleHeight}px`);
      showcase.style.setProperty('--stage-height', `${stageHeight}px`);
      const overflow = Math.max(0, height - visibleHeight);
      const transitionDistance = Math.min(540, Math.max(300, innerHeight * .6));
      const orderAt = (selected: number) => [selected, ...cards.map((_, i) => i).slice(0, selected).reverse(), ...cards.map((_, i) => i).slice(selected + 1)];

      context = gsap.context(() => {
        cards.forEach((card, index) => gsap.set(card, {
          x: 0, y: -index * spacing, scale: 1 - index * .035, zIndex: cards.length - index,
          transformOrigin: '50% 0%', opacity: 1, rotation: 0,
        }));
        gsap.set(track, { x: 0, y: 0 });
        gsap.set(contents, { y: 0 });
        const sequence = gsap.timeline({ paused: true, onUpdate: () => {
          setActive(indexAtTime(sequence.time()));
          showcase.dataset.sequenceProgress = sequence.progress().toFixed(4);
        } });
        timeline = sequence;
        let cursor = 0;
        cards.forEach((_, index) => {
          sequence.addLabel(`project-${index}`, cursor);
          // Page scrolling reveals tall content inside its folder. The outer
          // folder stack stays together, including every waiting tab and edge.
          sequence.to({}, { duration: 110 }, cursor);
          cursor += 110;
          if (overflow) {
            sequence.to(contents[index], { y: -overflow, duration: overflow, ease: 'none' }, cursor);
            cursor += overflow;
          }
          readingEnds.push(cursor);
          sequence.to({}, { duration: 90 }, cursor);
          cursor += 90;
          const incoming = cards[index + 1];
          if (!incoming) return;
          const handoff = cursor + transitionDistance * .5;
          handoffs.push(handoff);
          // Lift the next real folder, exchange depth, then settle the compact
          // stack. Both halves are scrubbed, including the reverse handoff.
          // Keep surfaces opaque. A reveal begins at the exposed upper edge,
          // avoiding both ghosted text and a full-card pop when depth changes.
          sequence.set(incoming, { clipPath: 'inset(-40px -12px calc(100% - 62px) -12px)' }, cursor);
          sequence.to(incoming, { x: 5, y: -52, scale: 1, rotation: .35, duration: transitionDistance * .5, ease: 'sine.inOut' }, cursor);
          sequence.to(cards[index], { x: -5, y: 12, scale: .94, rotation: -.35, duration: transitionDistance * .5, ease: 'sine.inOut' }, cursor);
          sequence.to(contents[index], { y: 0, duration: transitionDistance, ease: 'sine.inOut' }, cursor);
          orderAt(index + 1).forEach((position, depth) => {
            sequence.set(cards[position], { zIndex: cards.length - depth }, handoff);
            sequence.to(cards[position], { x: 0, y: -depth * spacing, scale: 1 - depth * .035, rotation: 0, opacity: 1, duration: transitionDistance * .5, ease: 'sine.inOut' }, handoff);
          });
          sequence.to(incoming, { clipPath: 'inset(-40px -12px -12px -12px)', duration: transitionDistance * .5, ease: 'sine.inOut' }, handoff);
          cursor += transitionDistance;
        });
        trigger = ScrollTrigger.create({
          trigger: showcase, pin: showcase, start: `top ${pinTop}px`,
          end: () => `+=${sequence.duration()}`,
          animation: sequence,
          // No timed catch-up: the presentation stops exactly with page scrolling.
          scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
        });
        trigger.refresh();
      }, showcase);
    }
    active = -1;
    setActive(indexAtTime(sequenceTime()));
    if (position) restorePosition(position);
    scheduleStack();
  };

  const updateStack = () => {
    scrollFrame = 0;
    if (timeline || resizeSnapshot) return;
    const guide = Math.min(innerHeight * .38, 320);
    let index = 0;
    cards.forEach((card, position) => { if (card.getBoundingClientRect().top <= guide) index = position; });
    setActive(index);
  };
  const scheduleStack = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateStack); };
  const indexFromHash = () => cards.findIndex(card => `#${card.id}` === location.hash);
  const restoreProject = (fromHistory = false) => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const saved = fromHistory || navigation?.type === 'back_forward' ? history.state?.projectPresentation?.slug : undefined;
    const savedIndex = cards.findIndex(card => card.dataset.projectSlug === saved);
    const index = savedIndex >= 0 ? savedIndex : indexFromHash();
    if (index >= 0) go(index, true);
  };

  previous.addEventListener('click', () => go(active - 1));
  next.addEventListener('click', () => go(active + 1));
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const destinations: Record<string, number> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: cards.length - 1 };
    if (event.key in destinations) { event.preventDefault(); go(destinations[event.key]); }
  });
  showcase.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-project-route]');
    if (link && timeline) {
      const card = link.closest<HTMLElement>('[data-project-card]')!;
      const level = Number(getComputedStyle(card).zIndex);
      const covered = cards.filter(folder => Number(getComputedStyle(folder).zIndex) > level).some(folder => {
        return [folder, folder.querySelector<HTMLElement>('.project-folder-tab')!].some(part => {
          const bounds = part.getBoundingClientRect();
          return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        });
      });
      // An inert incoming folder must not expose a covered link underneath it.
      if (covered) { event.preventDefault(); return; }
    }
    if (link) history.replaceState({ ...history.state, projectPresentation: { slug: link.dataset.projectRoute } }, '');
  });
  showcase.addEventListener('focusin', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-project-route]');
    if (!link || !timeline || !trigger) return;
    const bounds = link.getBoundingClientRect();
    const windowBounds = viewport.getBoundingClientRect();
    // Tab reaches the real link even when a short viewport needs a reading pass.
    if (bounds.bottom > windowBounds.bottom - 8 || bounds.top < windowBounds.top) scrollToTime(readingEnds[active], true);
  });
  addEventListener('scroll', scheduleStack, { passive: true });
  addEventListener('resize', () => {
    resizeSnapshot ??= readingPosition();
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const position = resizeSnapshot;
      resizeSnapshot = undefined;
      configure(position);
    }, 180);
  }, { passive: true });
  reduced.addEventListener('change', () => configure(readingPosition()));
  addEventListener('hashchange', () => { const index = indexFromHash(); if (index >= 0) go(index); });
  addEventListener('pageshow', event => { ScrollTrigger.refresh(); restoreProject(event.persisted); });
  showcase.querySelector<HTMLElement>('[data-project-navigation]')!.hidden = false;
  configure();
  requestAnimationFrame(() => restoreProject());
  document.fonts.ready.then(() => configure(readingPosition()));
}
