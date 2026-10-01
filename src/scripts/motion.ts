/** One reveal vocabulary, with separate entry and exit boundaries. */
export function initializeMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const pixels = [...document.querySelectorAll<HTMLElement>('[data-pixel-transition]')];
  let observers: IntersectionObserver[] = [];

  const configure = () => {
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    if (preference.matches || !('IntersectionObserver' in window)) {
      document.documentElement.classList.remove('has-reveal');
      items.forEach((item) => item.classList.add('revealed'));
      pixels.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    document.documentElement.classList.add('has-reveal');
    items.forEach((item) => {
      // A tall paragraph or mobile card should not require most of its area in view.
      const height = Math.max(1, item.offsetHeight);
      const entrance = Math.min(64, height * .18) / height;
      const observer = new IntersectionObserver(([entry]) => {
        if (item.contains(document.activeElement)) {
          item.classList.add('revealed');
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= entrance) {
          item.classList.remove('motion-exiting');
          item.classList.add('revealed');
        } else if (!entry.isIntersecting && item.dataset.motionOnce !== 'true') {
          // Exit only beyond the viewport buffer, never at the entrance threshold.
          item.style.setProperty('--motion-offset', entry.boundingClientRect.top < 0 ? '-14px' : '24px');
          item.classList.add('motion-exiting');
          item.classList.remove('revealed');
        }
      }, { threshold: [0, entrance], rootMargin: '24px 0px 24px 0px' });
      observer.observe(item);
      observers.push(observer);
    });
    const pixelObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        pixelObserver.unobserve(entry.target);
      }
    }), { threshold: .2 });
    pixels.forEach((item) => pixelObserver.observe(item));
    observers.push(pixelObserver);
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
