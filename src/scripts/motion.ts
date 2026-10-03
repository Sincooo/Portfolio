/** Content enters once, then stays readable when the visitor returns. */
export function initializeMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  let observers: IntersectionObserver[] = [];

  // Observe the full heading box; clipping that same box can prevent entry.
  items.filter((item) => item.dataset.motion === 'primary').forEach((item) => {
    if (item.querySelector(':scope > .motion-mask-content')) return;
    const content = document.createElement('span');
    content.className = 'motion-mask-content';
    content.append(...item.childNodes);
    item.append(content);
  });

  const configure = () => {
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    if (preference.matches || !('IntersectionObserver' in window)) {
      document.documentElement.classList.remove('has-reveal');
      items.forEach((item) => item.classList.add('revealed'));
      return;
    }
    document.documentElement.classList.add('has-reveal');
    items.forEach((item) => {
      if (item.classList.contains('revealed')) return;
      // A tall paragraph or mobile card should not require most of its area in view.
      const height = Math.max(1, item.offsetHeight);
      const entrance = Math.min(64, height * .18) / height;
      const observer = new IntersectionObserver(([entry]) => {
        if (item.contains(document.activeElement)) {
          item.classList.add('revealed');
          observer.disconnect();
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= entrance) {
          item.classList.add('revealed');
          observer.disconnect();
        }
      }, { threshold: [0, entrance], rootMargin: '24px 0px 24px 0px' });
      observer.observe(item);
      observers.push(observer);
    });
  };
  configure();
  preference.addEventListener('change', configure);
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(configure, 180);
  }, { passive: true });
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    event.target.closest('[data-reveal]')?.classList.add('revealed');
  });
}
