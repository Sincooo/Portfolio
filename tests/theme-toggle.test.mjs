import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const source = readFileSync(new URL('../src/scripts/theme-toggle.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

class Events {
  listeners = new Map();
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatch(type, properties = {}) {
    const event = { type, target: this, ...properties };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class Element extends Events {
  attributes = new Map();
  constructor(tag = 'button') { super(); this.tag = tag; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  closest(selector) { return selector === 'a[href]' && this.tag === 'a' ? this : null; }
  getBoundingClientRect() { return { left: 1018, top: 20, width: 44, height: 44 }; }
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

const flush = async () => {
  // Let both the controller's promise handlers and skipped update callbacks run.
  for (let index = 0; index < 8; index++) await Promise.resolve();
};

function setup(options = {}) {
  const button = new Element();
  const meta = new Element('meta');
  const classes = new Set(options.loading ? ['page-loading'] : []);
  const properties = new Map();
  const root = {
    dataset: { theme: options.theme ?? options.saved ?? 'dark' },
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
    },
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: name => properties.delete(name),
    },
  };
  const preference = Object.assign(new Events(), { matches: options.systemDark ?? true });
  const reduced = Object.assign(new Events(), { matches: options.reduced ?? false });
  const change = (query, matches) => { query.matches = matches; query.dispatch('change', { matches }); };
  const storage = new Map(options.saved ? [['portfolio-theme', options.saved]] : []);
  const writes = [];
  const document = Object.assign(new Events(), {
    documentElement: root,
    hidden: options.hidden ?? false,
    querySelector: selector => selector === '#theme-toggle'
      ? (options.noButton ? null : button)
      : selector === 'meta[name="theme-color"]' ? meta : null,
  });
  const window = new Events();
  const transitions = [];
  let maxConcurrent = 0;
  let concurrent = 0;
  if (options.api !== false) {
    document.startViewTransition = update => {
      if (options.throwOnStart) throw new Error('Capture unavailable');
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      const ready = deferred();
      const finished = deferred();
      let committed = false;
      let closed = false;
      const close = () => { if (!closed) { closed = true; concurrent--; } };
      const transition = {
        ready: ready.promise,
        finished: finished.promise,
        skipped: 0,
        commit() {
          if (!committed) { committed = true; update(); }
          ready.resolve();
        },
        finish() { this.commit(); close(); finished.resolve(); },
        rejectReady() { ready.reject(new Error('Snapshot rejected')); },
        rejectFinished() { close(); finished.reject(new Error('Transition interrupted')); },
        skipTransition() {
          this.skipped++;
          close();
          // Per the API, skipping an animation still runs its queued DOM update.
          Promise.resolve().then(() => {
            if (!committed) { committed = true; update(); }
            ready.reject(new Error('Transition skipped'));
            finished.resolve();
          });
        },
      };
      transitions.push(transition);
      return transition;
    };
  }
  const exports = {};
  const context = vm.createContext({
    exports, document, window, Element, innerWidth: 1280, innerHeight: 800,
    matchMedia: query => query.includes('reduced-motion') ? reduced : preference,
    localStorage: {
      getItem(key) { if (options.storageFails) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) {
        if (options.storageFails) throw new Error('Storage blocked');
        writes.push([key, value]); storage.set(key, value);
      },
    },
    CSS: { supports: () => options.css !== false },
    getComputedStyle: () => ({ color: root.dataset.theme === 'dark' ? '#f4f7fb' : '#18212d' }),
  });
  vm.runInContext(compiled, context, { filename: 'theme-toggle.ts' });
  exports.initializeThemeToggle();
  const assertSettled = theme => {
    assert.equal(root.dataset.theme, theme);
    assert.equal(button.getAttribute('aria-label'), `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    assert.equal(button.getAttribute('title'), button.getAttribute('aria-label'));
    assert.equal(meta.getAttribute('content'), theme === 'dark' ? '#0c1017' : '#f6f5f0');
    assert.equal(classes.has('theme-changing'), false);
    assert.equal(classes.has('theme-revealing'), false);
    assert.equal(properties.size, 0);
  };
  return {
    button, meta, root, classes, properties, preference, reduced, change, storage, writes,
    document, window, transitions, assertSettled,
    click: () => button.dispatch('click'),
    maxConcurrent: () => maxConcurrent,
  };
}

test('initializes labels from the theme restored before paint without overriding storage', () => {
  const app = setup({ saved: 'light', systemDark: true });
  app.assertSettled('light');
  assert.deepEqual(app.writes, []);
  assert.equal(app.transitions.length, 0);
  app.change(app.preference, true);
  app.assertSettled('light');
});

test('button-centered reveal commits theme, controls, and metadata together', async () => {
  const app = setup();
  app.click();
  assert.equal(app.storage.get('portfolio-theme'), 'light', 'persist intent before the capture completes');
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.button.getAttribute('aria-label'), 'Switch to light mode');
  assert.equal(app.properties.get('--theme-x'), '1040px');
  assert.equal(app.properties.get('--theme-y'), '42px');
  assert.equal(parseFloat(app.properties.get('--theme-radius')), Math.hypot(1040, 758) + 2);
  app.transitions[0].commit();
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.button.getAttribute('aria-label'), 'Switch to dark mode');
  assert.equal(app.meta.getAttribute('content'), '#f6f5f0');
  app.transitions[0].finish();
  await flush();
  app.assertSettled('light');
  app.click();
  app.transitions[1].finish();
  await flush();
  app.assertSettled('dark');
  assert.equal(app.storage.get('portfolio-theme'), 'dark');
});

for (const count of [2, 3, 5, 6]) {
  test(`${count} rapid toggles preserve parity and never overlap captures`, async () => {
    const app = setup();
    for (let index = 0; index < count; index++) app.click();
    assert.equal(app.transitions.length, 1);
    assert.equal(app.storage.get('portfolio-theme'), count % 2 ? 'light' : 'dark');
    app.transitions[0].finish();
    await flush();
    if (count % 2 === 0) {
      assert.equal(app.transitions.length, 2);
      app.transitions[1].finish();
      await flush();
    } else assert.equal(app.transitions.length, 1);
    app.assertSettled(count % 2 ? 'light' : 'dark');
    assert.equal(app.maxConcurrent(), 1);
    assert.equal(app.writes.length, count);
  });
}

test('clicks after the first capture commit also coalesce correctly', async () => {
  const app = setup();
  app.click();
  app.transitions[0].commit();
  app.click();
  app.click();
  app.click();
  app.transitions[0].finish();
  await flush();
  assert.equal(app.transitions.length, 2);
  app.transitions[1].finish();
  await flush();
  app.assertSettled('dark');
  assert.equal(app.maxConcurrent(), 1);
});

for (const [name, options] of [
  ['missing View Transition API', { api: false }],
  ['unsupported reveal CSS', { css: false }],
  ['reduced motion', { reduced: true }],
  ['hidden document', { hidden: true }],
  ['active loader', { loading: true }],
  ['synchronous capture failure', { throwOnStart: true }],
]) {
  test(`${name} switches immediately and preserves preference`, () => {
    const app = setup(options);
    app.click();
    app.assertSettled('light');
    assert.equal(app.storage.get('portfolio-theme'), 'light');
    assert.equal(app.transitions.length, 0);
    app.click();
    app.assertSettled('dark');
  });
}

test('blocked storage cannot prevent the theme switch or manual preference', () => {
  const app = setup({ api: false, storageFails: true });
  app.click();
  app.assertSettled('light');
  app.change(app.preference, true);
  app.assertSettled('light');
});

test('a skipped delayed callback cannot overwrite a more recent immediate choice', async () => {
  const app = setup();
  app.click();
  app.change(app.reduced, true);
  app.assertSettled('light');
  app.click();
  app.assertSettled('dark');
  await flush();
  app.assertSettled('dark');
  assert.equal(app.transitions[0].skipped, 1);
  assert.equal(app.storage.get('portfolio-theme'), 'dark');
});

for (const promise of ['ready', 'finished', 'both']) {
  test(`${promise} rejection is consumed and settles the latest queued choice`, async () => {
    const app = setup();
    app.click();
    app.click();
    if (promise !== 'finished') app.transitions[0].rejectReady();
    if (promise !== 'ready') app.transitions[0].rejectFinished();
    await flush();
    app.assertSettled('dark');
    assert.equal(app.storage.get('portfolio-theme'), 'dark');
    app.click();
    assert.equal(app.transitions.length, 2, 'a failed reveal must not leave the controller busy');
    app.transitions[1].finish();
    await flush();
    app.assertSettled('light');
  });
}

test('system changes apply immediately until a user makes a manual choice', () => {
  const app = setup({ api: false });
  app.change(app.preference, false);
  app.assertSettled('light');
  assert.equal(app.writes.length, 0);
  app.click();
  app.assertSettled('dark');
  app.change(app.preference, false);
  app.assertSettled('dark');
  assert.equal(app.storage.get('portfolio-theme'), 'dark');
});

for (const cause of ['resize', 'pagehide', 'hidden', 'link']) {
  test(`${cause} cancels an active reveal and leaves normal navigation available`, async () => {
    const app = setup();
    app.click();
    if (cause === 'hidden') {
      app.document.hidden = true;
      app.document.dispatch('visibilitychange');
    } else if (cause === 'link') app.document.dispatch('click', { target: new Element('a') });
    else app.window.dispatch(cause);
    app.assertSettled('light');
    await flush();
    app.assertSettled('light');
    assert.equal(app.transitions[0].skipped, 1);
  });
}

test('Back/Forward-cache return restores a preference changed on another page', async () => {
  const app = setup({ saved: 'dark' });
  app.click();
  app.window.dispatch('pagehide');
  await flush();
  app.storage.set('portfolio-theme', 'dark');
  app.window.dispatch('pageshow', { persisted: true });
  app.assertSettled('dark');
  app.change(app.preference, false);
  app.assertSettled('dark');
});

test('Back/Forward-cache return follows the system when no manual choice exists', () => {
  const app = setup();
  app.preference.matches = false;
  app.window.dispatch('pageshow', { persisted: false });
  app.assertSettled('dark');
  app.window.dispatch('pageshow', { persisted: true });
  app.assertSettled('light');
  assert.equal(app.storage.size, 0);
});

test('pages without a theme button initialize safely', () => {
  const app = setup({ noButton: true });
  assert.equal(app.transitions.length, 0);
  assert.equal(app.writes.length, 0);
});
