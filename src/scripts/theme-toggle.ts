type Theme = 'light' | 'dark';

export function initializeThemeToggle() {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (!button) return;
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const savedTheme = (): Theme | null => {
    try {
      const saved = localStorage.getItem('portfolio-theme');
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch { return null; }
  };
  let manual = savedTheme() !== null;
  let desired: Theme = root.dataset.theme === 'light' ? 'light' : 'dark';
  let active: ViewTransition | undefined;
  let generation = 0;

  const apply = (theme: Theme) => {
    root.dataset.theme = theme;
    const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c1017' : '#f6f5f0');
  };
  const clearReveal = () => {
    root.classList.remove('theme-changing', 'theme-revealing');
    ['--theme-x', '--theme-y', '--theme-radius'].forEach(property => root.style.removeProperty(property));
  };
  const settle = () => {
    // A skipped transition still invokes its update callback; invalidate it first.
    generation++;
    active?.skipTransition();
    active = undefined;
    root.classList.add('theme-changing');
    apply(desired);
    // Commit final colors before restoring ordinary control transitions.
    getComputedStyle(root).color;
    clearReveal();
  };
  const canReveal = () => !reduced.matches && !document.hidden
    && !root.classList.contains('page-loading')
    && typeof document.startViewTransition === 'function'
    && CSS.supports('clip-path', 'circle(1px at 1px 1px)')
    && CSS.supports('selector(::view-transition-new(root))');

  const reveal = () => {
    if (!canReveal()) { settle(); return; }
    if (active || desired === root.dataset.theme) return;
    const target = desired;
    const ticket = ++generation;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);
    root.style.setProperty('--theme-radius', `${radius}px`);
    root.classList.add('theme-changing', 'theme-revealing');
    try {
      const transition = document.startViewTransition(() => {
        if (ticket === generation) apply(target);
      });
      active = transition;
      // Both promises can reject independently; consume both and fall back immediately.
      void transition.ready.catch(() => { if (ticket === generation) settle(); });
      void transition.finished.then(() => {
        if (ticket !== generation) return;
        active = undefined;
        clearReveal();
        // Coalesce repeated clicks into the latest requested theme, without overlapping captures.
        if (desired !== root.dataset.theme) reveal();
      }, () => { if (ticket === generation) settle(); });
    } catch { settle(); }
  };

  apply(desired);
  button.addEventListener('click', () => {
    desired = desired === 'dark' ? 'light' : 'dark';
    manual = true;
    try { localStorage.setItem('portfolio-theme', desired); } catch {}
    reveal();
  });
  preference.addEventListener('change', event => {
    if (!manual) { desired = event.matches ? 'dark' : 'light'; settle(); }
  });
  reduced.addEventListener('change', event => { if (event.matches) settle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('resize', () => { if (active) settle(); }, { passive: true });
  window.addEventListener('pagehide', settle);
  // Keep full-document project transitions available when a link is followed mid-reveal.
  document.addEventListener('click', event => {
    if (active && event.target instanceof Element && event.target.closest('a[href]')) settle();
  }, { capture: true });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const saved = savedTheme();
    if (saved) { desired = saved; manual = true; }
    else if (!manual) desired = preference.matches ? 'dark' : 'light';
    settle();
  });
}
