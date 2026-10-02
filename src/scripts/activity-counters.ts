import { formatStatistic } from '../lib/github-activity';

export function initializeActivityCounters(container: HTMLElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const counters = [...container.querySelectorAll<HTMLElement>('[data-github-counter]')].map((element) => ({
    element, target: Number(element.dataset.target), current: Number(element.dataset.target), decimals: Number(element.dataset.decimals || 0),
  }));
  let started = reduced.matches || !('IntersectionObserver' in window);
  let frame = 0;
  const finish = () => {
    cancelAnimationFrame(frame);
    counters.forEach((counter) => {
      counter.current = counter.target;
      counter.element.textContent = formatStatistic(counter.target, counter.decimals);
    });
    container.dataset.counterState = 'complete';
  };
  const animate = () => {
    cancelAnimationFrame(frame);
    if (reduced.matches || document.hidden) { finish(); return; }
    const origins = counters.map((counter) => counter.current);
    const began = performance.now();
    container.dataset.counterState = 'running';
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / 1000);
      const eased = 1 - (1 - progress) ** 3;
      counters.forEach((counter, index) => {
        counter.current = origins[index] + (counter.target - origins[index]) * eased;
        counter.element.textContent = formatStatistic(counter.current, counter.decimals);
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
  };
  if (!started) {
    counters.forEach((counter) => { counter.current = 0; counter.element.textContent = formatStatistic(0, counter.decimals); });
    container.dataset.counterState = 'waiting';
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (started) { observer.disconnect(); return; }
      started = true;
      observer.disconnect();
      animate();
    }, { threshold: .2 });
    observer.observe(container);
  } else finish();
  reduced.addEventListener('change', () => { if (reduced.matches) { started = true; finish(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && started) finish(); });
  return (values: Record<string, number>) => {
    let changed = false;
    counters.forEach((counter) => {
      const value = values[counter.element.id];
      if (!Number.isFinite(value) || value < 0) return;
      changed ||= value !== counter.target;
      counter.target = value;
      counter.element.dataset.target = String(value);
      const unit = counter.element.dataset.unit === 'days' && value === 1 ? 'day' : counter.element.dataset.unit;
      counter.element.closest('.github-stat-value')?.setAttribute('aria-label', `${formatStatistic(value, counter.decimals)} ${unit}`);
    });
    // A fresh response retargets the current values; revisits never start at zero.
    if (started && changed) animate();
  };
}
