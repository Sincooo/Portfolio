/** Arrows stay still; non-directional icons retain the existing button feedback. */
export function initializeSpringButtons() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const controls = document.querySelectorAll<HTMLElement>('.button, .project-folder-link, .project-controls button, .theme-toggle, .dialog-bar button, .dialog-bottom button, .experience-item a, .contact-links a');
  const resetters: (() => void)[] = [];
  let pointerRelease: (() => void) | undefined;
  let activePointer: number | undefined;

  controls.forEach(control => {
    const icons = [...control.querySelectorAll<HTMLElement>(':scope > span[aria-hidden="true"]')];
    // These controls contain only a decorative glyph and already have an accessible label.
    if (!icons.length && control.matches('.dialog-bar button, .dialog-bottom button, .experience-item a')) {
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.append(...control.childNodes);
      control.append(icon);
      icons.push(icon);
    }
    if (!icons.length) return;
    control.dataset.springReady = '';
    const glyphs = icons.filter(icon => {
      const arrow = /[\u2190-\u21ff]/u.test(icon.textContent || '');
      if (arrow) icon.classList.add('static-arrow');
      return !arrow;
    }).map(icon => {
      icon.classList.add('spring-icon');
      const glyph = document.createElement('span');
      glyph.className = 'spring-glyph';
      glyph.append(...icon.childNodes);
      icon.append(glyph);
      return glyph;
    });
    const animations = new Map<HTMLElement, Animation>();
    let frame = 0;
    let dx = 0, dy = 0;
    let keyboardPressed = false;
    const disabled = () => control.matches(':disabled, [aria-disabled="true"]');

    const animateGlyphs = (mode: 'press' | 'release' | 'focus') => {
      if (reduced.matches || document.hidden || (disabled() && mode !== 'release')) return;
      glyphs.forEach(glyph => {
        const current = new DOMMatrixReadOnly(getComputedStyle(glyph).transform).a;
        animations.get(glyph)?.cancel();
        let keyframes: Keyframe[];
        if (mode === 'press') keyframes = [{ transform: `scale(${current})` }, { transform: 'scale(.78)' }];
        else if (mode === 'focus' || Math.abs(current - 1) < .01) keyframes = [
          { transform: `scale(${current})`, offset: 0 }, { transform: 'scale(.9)', offset: .18 },
          { transform: 'scale(1.055)', offset: .5 }, { transform: 'scale(.99)', offset: .78 }, { transform: 'scale(1)', offset: 1 },
        ];
        else {
          // Sample a damped spring. Its first frame matches an interrupted press exactly.
          keyframes = Array.from({ length: 25 }, (_, index) => {
            const t = index / 24;
            const scale = index === 24 ? 1 : 1 + (current - 1) * Math.exp(-6 * t) * (Math.cos(12 * t) + .5 * Math.sin(12 * t));
            return { transform: `scale(${scale})`, offset: t };
          });
        }
        const animation = glyph.animate(keyframes, { duration: mode === 'press' ? 90 : 480, easing: mode === 'press' ? 'ease-out' : 'linear', fill: 'forwards' });
        animations.set(glyph, animation);
        if (mode !== 'press') animation.onfinish = () => { animation.cancel(); animations.delete(glyph); };
      });
    };
    const resetPointer = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      control.style.removeProperty('--spring-x');
      control.style.removeProperty('--spring-y');
    };
    const release = () => {
      if (!control.classList.contains('is-spring-pressed')) return;
      control.classList.remove('is-spring-pressed');
      animateGlyphs('release');
    };
    control.addEventListener('pointermove', event => {
      if (!glyphs.length || event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches || disabled()) return;
      const bounds = control.getBoundingClientRect();
      dx = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)) * 3.5;
      dy = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) * 3.5;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        control.style.setProperty('--spring-x', `${dx.toFixed(2)}px`);
        control.style.setProperty('--spring-y', `${dy.toFixed(2)}px`);
      });
    }, { passive: true });
    control.addEventListener('pointerleave', resetPointer);
    control.addEventListener('pointerdown', event => {
      if (event.button !== 0 || disabled()) return;
      pointerRelease?.();
      activePointer = event.pointerId;
      pointerRelease = () => { release(); if (event.pointerType !== 'mouse') resetPointer(); };
      control.classList.add('is-spring-pressed');
      animateGlyphs('press');
    });
    control.addEventListener('focus', () => { if (control.matches(':focus-visible')) animateGlyphs('focus'); });
    const activationKey = (key: string) => key === 'Enter' || (key === ' ' && control.tagName === 'BUTTON');
    control.addEventListener('keydown', event => {
      if (!activationKey(event.key) || event.repeat || disabled()) return;
      keyboardPressed = true;
      control.classList.add('is-spring-pressed');
      animateGlyphs('press');
    });
    control.addEventListener('keyup', event => {
      if (activationKey(event.key) && keyboardPressed) { keyboardPressed = false; release(); }
    });
    control.addEventListener('click', event => {
      if (event.detail === 0 && !keyboardPressed) animateGlyphs('focus');
    });
    control.addEventListener('blur', () => { keyboardPressed = false; resetPointer(); release(); });
    resetters.push(() => {
      keyboardPressed = false;
      resetPointer();
      control.classList.remove('is-spring-pressed');
      animations.forEach(animation => animation.cancel());
      animations.clear();
    });
  });
  const finishPointer = (event: PointerEvent) => {
    if (event.pointerId !== activePointer) return;
    pointerRelease?.();
    pointerRelease = undefined;
    activePointer = undefined;
  };
  addEventListener('pointerup', finishPointer);
  addEventListener('pointercancel', finishPointer);
  const resetAll = () => { pointerRelease = undefined; activePointer = undefined; resetters.forEach(reset => reset()); };
  addEventListener('blur', resetAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });
  reduced.addEventListener('change', resetAll);
  finePointer.addEventListener('change', resetAll);
}
