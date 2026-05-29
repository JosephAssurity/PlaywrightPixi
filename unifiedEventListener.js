(function initPixiUnifiedListener() {

  if (window.__pixiUnifiedInstalled) {
    console.log("✅ Pixi unified listener already installed");
    return;
  }

  window.__pixiUnifiedInstalled = true;

  let lastHoveredPath = null;

  // =============================
  // STAGE DETECTION (multi-vendor)
  // =============================
  function getStage() {
    const w = window;

    if (w.__PIXI_STAGE__) return w.__PIXI_STAGE__;
    if (w.pixi_app?.stage) return w.pixi_app.stage;
    if (w.__PIXI_APP__?.stage) return w.__PIXI_APP__.stage;
    if (w.app?.stage) return w.app.stage;
    if (w.__pixiStage) return w.__pixiStage;

    return null;
  }

  // =============================
  // BUILD PATH
  // =============================
  function getPath(obj) {
    const parts = [];
    let current = obj;

    while (current) {
      const parent = current.parent;

      if (!parent) {
        parts.unshift("stage");
        break;
      }

      const index = parent.children?.indexOf(current);
      parts.unshift(`children[${index}]`);

      current = parent;
    }

    return parts.join(".");
  }

  // =============================
  // VISIBILITY CHECK
  // =============================
  function isVisible(node) {
    let current = node;

    while (current) {
      if (
        current.visible === false ||
        current.renderable === false ||
        (current.alpha ?? 1) <= 0
      ) return false;

      current = current.parent;
    }

    return true;
  }

  // =============================
  // UI DETECTION
  // =============================
  function isUI(node) {
    if (!node) return false;

    const name = (node.name || "").toLowerCase();
    const type = node.constructor?.name;

    return (
      node.interactive ||
      node.cursor === "pointer" ||
      node.buttonMode ||
      node.eventMode === "static" ||
      node.eventMode === "dynamic" ||

      node.listeners?.("pointertap")?.length ||
      node.listeners?.("click")?.length ||

      type === "Text" ||
      type === "BitmapText" ||
      typeof node.text === "string" ||

      /button|btn|play|try|confirm|close/i.test(name)
    );
  }

  // =============================
  // SAFE BOUNDS
  // =============================
  function getBounds(node) {
    try {
      const b = node.getBounds?.();
      if (!b || b.width <= 0 || b.height <= 0) return null;
      return b;
    } catch {
      return null;
    }
  }

  // =============================
  // RECURSIVE SCAN
  // =============================
  function scan(node, results = [], path = "stage") {
    if (!node) return results;

    const bounds = getBounds(node);

    if (isUI(node) && isVisible(node) && bounds) {
      results.push({ node, path, bounds });
    }

    node.children?.forEach((child, i) => {
      scan(child, results, `${path}.children[${i}]`);
    });

    return results;
  }

  // =============================
  // HIGHLIGHT BOX
  // =============================
  const highlight = document.createElement("div");

  highlight.style.position = "fixed";
  highlight.style.border = "3px solid red";
  highlight.style.background = "rgba(255,0,0,0.1)";
  highlight.style.pointerEvents = "none";
  highlight.style.zIndex = 999999;
  highlight.style.display = "none";

  document.body.appendChild(highlight);

  function drawHighlight(bounds) {
    const canvas = document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();

    if (!canvas || !rect) return;

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    highlight.style.left = rect.left + bounds.x * scaleX + "px";
    highlight.style.top = rect.top + bounds.y * scaleY + "px";
    highlight.style.width = bounds.width * scaleX + "px";
    highlight.style.height = bounds.height * scaleY + "px";
    highlight.style.display = "block";
  }

  // =============================
  // MAIN MOUSE TRACKER
  // =============================
  window.addEventListener("mousemove", (e) => {

    const stage = getStage();
    if (!stage) return;

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const pixiX = (e.clientX - rect.left) * scaleX;
    const pixiY = (e.clientY - rect.top) * scaleY;

    const hits = scan(stage);

    let top = null;

    for (const item of hits) {
      const b = item.bounds;

      const inside =
        pixiX >= b.x &&
        pixiX <= b.x + b.width &&
        pixiY >= b.y &&
        pixiY <= b.y + b.height;

      if (inside) top = item;
    }

    const path = top?.path;

    if (path && path !== lastHoveredPath) {
      lastHoveredPath = path;

      window.__pixiPath = path;
      window.__pixiTarget = top.node;

      console.clear();
      console.log("🎯 PIXI PATH");
      console.log(path);

      drawHighlight(top.bounds);
    }

    if (!top) {
      highlight.style.display = "none";
    }
  });

  console.log("✅ Unified Pixi Listener Installed");

})();
