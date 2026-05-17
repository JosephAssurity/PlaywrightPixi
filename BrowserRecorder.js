// ======================================================
// SIMPLE UNIFIED PIXI HOVER INSPECTOR
// Works for: New games (scan mode) + Old games (hook mode)
// ======================================================

let lastHoveredPath = null;
let lastObj = null;

// ======================================================
// HIGHLIGHT BOX (UI overlay)
// ======================================================
const highlight = document.createElement('div');

highlight.style.position = 'fixed';
highlight.style.border = '4px solid red';
highlight.style.background = 'rgba(255,0,0,0.08)';
highlight.style.pointerEvents = 'none';
highlight.style.zIndex = 999999;
highlight.style.boxSizing = 'border-box';
highlight.style.display = 'none';

document.body.appendChild(highlight);

// ======================================================
// PATH GENERATOR
// Converts PIXI tree → stage.children[x].children[y]...
// ======================================================
function getDisplayPath(obj) {

  const parts = [];
  let current = obj;

  while (current.parent) {

    const parent = current.parent;
    const index = parent.children.indexOf(current);

    parts.unshift(`children[${index}]`);
    current = parent;
  }

  return 'stage.' + parts.join('.');
}

// ======================================================
// UI FILTER (keeps only buttons / text / labels)
// ======================================================
function isUI(node) {

  if (!node) return false;

  const name = (node.name || '').toLowerCase();
  const type = node.constructor?.name;

  return (
    // interactive elements (buttons, clickable UI)
    node.interactive ||
    node.cursor === 'pointer' ||
    node.buttonMode ||
    node.eventMode === 'static' ||
    node.eventMode === 'dynamic' ||

    // text elements
    type === 'Text' ||
    type === 'BitmapText' ||
    node.text ||

    // naming-based UI detection
    /button|btn|label|tab/i.test(name)
  );
}

// ======================================================
// VISIBILITY CHECK (used in scan mode)
// Prevents hidden elements from being detected
// ======================================================
function isVisible(node) {

  let current = node;

  while (current) {

    if (
      current.visible === false ||
      current.renderable === false ||
      (current.alpha ?? 1) <= 0
    ) {
      return false;
    }

    current = current.parent;
  }

  return true;
}

// ======================================================
// NEW MODE (no PIXI app access needed)
// Uses recursive scan + mouse position
// ======================================================
function initNewMode(app) {

  if (!app?.stage) return false;

  // Scan full PIXI tree for UI elements
  function scan(node, results = [], path = 'stage') {

    if (!node) return results;

    if (isUI(node) && isVisible(node)) {

      const bounds = node.getBounds?.();

      if (bounds && bounds.width > 0 && bounds.height > 0) {
        results.push({ node, path, bounds });
      }
    }

    node.children?.forEach((child, i) => {
      scan(child, results, `${path}.children[${i}]`);
    });

    return results;
  }

  // Find top-most UI element under cursor
  function getTopHit(x, y) {

    const hits = scan(app.stage);

    let top = null;

    for (const item of hits) {

      const b = item.bounds;

      const inside =
        x >= b.x &&
        x <= b.x + b.width &&
        y >= b.y &&
        y <= b.y + b.height;

      if (inside) top = item;
    }

    return top;
  }

  // Mouse tracking (NEW games)
  window.addEventListener('mousemove', (e) => {

    const hit = getTopHit(e.clientX, e.clientY);
    const path = hit?.path;

    if (path !== lastHoveredPath) {

      lastHoveredPath = path;

      if (hit) {

        const b = hit.bounds;

        window.__pixiTarget = hit.node;
        window.__pixiPath = hit.path;
        window.__pixiBounds = hit.bounds;
        window.__pixiStage = app.stage;

        console.clear();
        console.log('🎯 NEW MODE PATH');
        console.log(hit.path);
        console.log('Saved target as window.__pixiTarget');
        console.log('Now you can run: __pixiRecord("objectName", "screenName")');
        // Move highlight box
        highlight.style.left = b.x + 'px';
        highlight.style.top = b.y + 'px';
        highlight.style.width = b.width + 'px';
        highlight.style.height = b.height + 'px';
        highlight.style.display = 'block';

      } else {
        highlight.style.display = 'none';
      }
    }
  });

  return true;
}

// ======================================================
// OLD MODE (Pixi InteractionManager hook)
// Only works if PIXI.interaction exists
// ======================================================
function initOldMode() {

  if (!PIXI?.interaction?.InteractionManager) return false;

  const proto = PIXI.interaction.InteractionManager.prototype;
  const original = proto.processInteractive;

  proto.processInteractive = function (...args) {

    const event = args[0];
    const obj = args[1];

    try {

      if (obj && obj.getBounds && isUI(obj)) {

        const b = obj.getBounds();
        const mouse = event.data.global;

        const inside =
          mouse.x >= b.x &&
          mouse.x <= b.x + b.width &&
          mouse.y >= b.y &&
          mouse.y <= b.y + b.height;

        if (inside && lastObj !== obj) {

          lastObj = obj;

        const path = getDisplayPath(obj);

        window.__pixiTarget = obj;
        window.__pixiPath = path;
        window.__pixiBounds = b;

        let root = obj;
        while (root.parent) {
        root = root.parent;
        }
        window.__pixiStage = root;

        console.clear();
        console.log('🎯 OLD MODE PATH');
        console.log(path);
        console.log('Saved target as window.__pixiTarget');
        console.log('Now you can run: __pixiRecord("objectName", "screenName")');

          // Move highlight box
          highlight.style.left = b.x + 'px';
          highlight.style.top = b.y + 'px';
          highlight.style.width = b.width + 'px';
          highlight.style.height = b.height + 'px';
          highlight.style.display = 'block';
        }
      }

    } catch (err) {
      console.error(err);
    }

    return original.call(this, ...args);
  };

  return true;
}

// ======================================================
// AUTO MODE SELECTOR
// Chooses best available method
// ======================================================
(function init() {

  const app =
    window.__PIXI_APP__ ||
    window.app;

  // Try NEW mode first
  if (initNewMode(app)) {
    console.log('🟢 New mode active');
    return;
  }

  // Fallback to OLD mode
  if (initOldMode()) {
    console.log('🟡 Old mode active');
    return;
  }

  console.error('❌ No compatible PIXI mode found');
})();

window.__pixiRecorderRecords = window.__pixiRecorderRecords || [];

function collectPixiText(obj, texts = []) {
  if (!obj) return "";

  if (typeof obj.text === "string") {
    texts.push(obj.text);
  }

  for (const child of obj.children || []) {
    collectPixiText(child, texts);
  }

  return texts.join(" ");
}

window.__pixiRecord = function __pixiRecord(name, screen = "unknown") {
  const target = window.__pixiTarget;
  const pixiPath = window.__pixiPath;

  if (!target || !pixiPath) {
    console.warn("No Pixi target saved. Hover an object first.");
    return null;
  }

  const b = target.getBounds();

  const record = {
    name,
    screen,
    path: pixiPath,
    text: collectPixiText(target),
    bounds: {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      centerX: b.x + b.width / 2,
      centerY: b.y + b.height / 2,
    },
    meta: {
      constructorName: target.constructor?.name ?? null,
      interactive: Boolean(target.interactive),
      buttonMode: Boolean(target.buttonMode),
      eventMode: target.eventMode ?? null,
      cursor: target.cursor ?? null,
      name: target.name ?? null,
      visible: target.visible,
      renderable: target.renderable,
      alpha: target.alpha,
      worldAlpha: target.worldAlpha,
    },
  };

  const existingIndex = window.__pixiRecorderRecords.findIndex(
    item => item.name === name && item.screen === screen
  );

  if (existingIndex >= 0) {
    window.__pixiRecorderRecords[existingIndex] = record;
  } else {
    window.__pixiRecorderRecords.push(record);
  }

  console.log("✅ Recorded Pixi object:", record);
  console.table(
    window.__pixiRecorderRecords.map(r => ({
      screen: r.screen,
      name: r.name,
      path: r.path,
      text: r.text,
    }))
  );

  return record;
};

window.__pixiExport = function __pixiExport() {
  console.log(JSON.stringify(window.__pixiRecorderRecords, null, 2));
  return window.__pixiRecorderRecords;
};

window.__pixiClearRecords = function __pixiClearRecords() {
  window.__pixiRecorderRecords = [];
  console.log("Cleared Pixi recorder records.");
};