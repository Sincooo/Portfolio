/** Native scrolling drives these layers; no scroll hijacking or idle frame loop. */
export function initializeSectionFlow() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const sections = [...document.querySelectorAll<HTMLElement>('main > section[id]:not(#home)')];
  const scenes = sections.map((section) => {
    section.classList.add('flow-section');
    const layer = document.createElement('div');
    layer.className = 'section-flow-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<i class="flow-wash"></i><i class="flow-line"></i><i class="flow-orbit"></i>';
    section.prepend(layer);
    const headings = [...section.querySelectorAll<HTMLElement>('h2')].map((heading) => {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      const words: HTMLElement[] = [];
      nodes.forEach((node) => {
        if (!node.textContent?.trim()) return;
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((text) => {
          if (!text.trim()) { fragment.append(document.createTextNode(text)); return; }
          const word = document.createElement('span');
          word.className = 'flow-word';
          word.textContent = text;
          fragment.append(word);
          words.push(word);
        });
        node.replaceWith(fragment);
      });
      return { heading, words };
    });
    return { section, headings };
  });
  const active = new Set<HTMLElement>();
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  let frame = 0;
  let lastScroll = scrollY;
  const update = () => {
    frame = 0;
    if (reduced.matches) return;
    const currentScroll = scrollY;
    if (Math.abs(currentScroll - lastScroll) > 2) root.dataset.scrollDirection = currentScroll > lastScroll ? 'down' : 'up';
    lastScroll = currentScroll;
    const viewport = innerHeight;
    // Read all geometry first, then write styles without layout thrashing.
    const readings = scenes.filter(({ section }) => active.has(section)).map((scene) => ({
      scene, bounds: scene.section.getBoundingClientRect(),
      headings: scene.headings.map((item) => ({ item, bounds: item.heading.getBoundingClientRect() })),
    }));
    readings.forEach(({ scene, bounds, headings }) => {
      const progress = clamp((viewport - bounds.top) / (viewport + bounds.height));
      scene.section.style.setProperty('--section-progress', progress.toFixed(4));
      headings.forEach(({ item, bounds: title }) => {
        const entry = clamp((viewport * .96 - title.top) / Math.min(viewport * .32, 240));
        const returnEntry = clamp((title.bottom + 24) / Math.min(120, Math.max(64, title.height)));
        const progress = Math.min(entry, returnEntry);
        item.words.forEach((word, index) => {
          const start = Math.min(index * .055, .25);
          word.style.setProperty('--word-progress', clamp((progress - start) / (1 - start)).toFixed(4));
        });
      });
    });
  };
  const schedule = () => { if (!frame && !reduced.matches) frame = requestAnimationFrame(update); };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) active.add(entry.target as HTMLElement);
        else active.delete(entry.target as HTMLElement);
      });
      schedule();
    }, { rootMargin: '180px' });
    sections.forEach((section) => observer.observe(section));
  } else sections.forEach((section) => active.add(section));
  const configure = () => {
    root.classList.toggle('has-scroll-flow', !reduced.matches);
    if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  addEventListener('load', schedule, { once: true });
  reduced.addEventListener('change', configure);
  configure();
}
