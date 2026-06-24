(() => {
  if (window.__pixiDebugHelpersInstalled) return;
  window.__pixiDebugHelpersInstalled = true;

  function getStage() {
    return (
      window.__PIXI_APP__?.stage ||
      window.__pixiStage ||
      window.__PIXI_STAGE__ ||
      window.pixi_app?.stage ||
      window.app?.stage ||
      null
    );
  }

  function getBoundsSafe(obj) {
    try {
      const b = obj?.getBounds?.();
      if (!b) return null;
      return {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      };
    } catch {
      return null;
    }
  }

  function collectText(node, texts = []) {
    if (!node) return "";

    if (typeof node.text === "string" && node.text.trim().length > 0) {
      texts.push(node.text.trim());
    }

    for (const child of node.children || []) {
      collectText(child, texts);
    }

    return texts.join(" ").trim();
  }

  function getCenterGlobal(target) {
    try {
      const b = target.getBounds?.();
      if (b) {
        return {
          x: b.x + b.width / 2,
          y: b.y + b.height / 2,
        };
      }
    } catch {}

    try {
      const p = target.getGlobalPosition?.();
      if (p) {
        return {
          x: p.x,
          y: p.y,
        };
      }
    } catch {}

    return {
      x: target.x ?? 0,
      y: target.y ?? 0,
    };
  }

  window.__getPixiByPath = function (path) {
    const stage = getStage();
    if (!stage) return null;

    let current = stage;
    const parts = path.replace(/^stage\.?/, "").split(".").filter(Boolean);

    for (const part of parts) {
      const match = part.match(/^children\[(\d+)\]$/);
      if (!match) return null;

      current = current?.children?.[Number(match[1])];
      if (!current) return null;
    }

    return current;
  };

  window.__pixiState = function (path) {
    const obj = window.__getPixiByPath(path);
    if (!obj) return null;

    return {
      path,
      exists: true,
      name: obj.name ?? null,
      label: obj.label ?? null,
      type: obj.type ?? obj.constructor?.name ?? null,

      visible: obj.visible,
      renderable: obj.renderable,
      alpha: obj.alpha,
      worldAlpha: obj.worldAlpha,
      worldVisible: obj.worldVisible ?? null,

      interactive: obj.interactive,
      buttonMode: obj.buttonMode,
      eventMode: obj.eventMode,
      cursor: obj.cursor ?? null,

      _internalInteractive: obj._internalInteractive ?? null,
      _internalEventMode: obj._internalEventMode ?? null,

      text: collectText(obj),
      childCount: obj.children?.length ?? 0,
      bounds: getBoundsSafe(obj),
      template: obj.template ?? null,

      listeners: obj.listeners
        ? {
            pointerover: obj.listeners("pointerover")?.length ?? 0,
            pointermove: obj.listeners("pointermove")?.length ?? 0,
            pointerdown: obj.listeners("pointerdown")?.length ?? 0,
            pointerup: obj.listeners("pointerup")?.length ?? 0,
            pointertap: obj.listeners("pointertap")?.length ?? 0,
            click: obj.listeners("click")?.length ?? 0,
            tap: obj.listeners("tap")?.length ?? 0,
            mousedown: obj.listeners("mousedown")?.length ?? 0,
            mouseup: obj.listeners("mouseup")?.length ?? 0,
          }
        : null,
    };
  };

  window.__pixiChildren = function (path = "stage") {
    const obj = path === "stage" ? getStage() : window.__getPixiByPath(path);
    if (!obj) return [];

    return (obj.children || []).map((child, index) => ({
      index,
      path: `${path === "stage" ? "stage" : path}.children[${index}]`,
      name: child?.name ?? null,
      label: child?.label ?? null,
      type: child?.type ?? child?.constructor?.name ?? null,
      text: collectText(child),
      visible: child?.visible,
      renderable: child?.renderable,
      alpha: child?.alpha,
      worldAlpha: child?.worldAlpha,
      interactive: child?.interactive,
      buttonMode: child?.buttonMode,
      eventMode: child?.eventMode,
      cursor: child?.cursor ?? null,
      _internalInteractive: child?._internalInteractive ?? null,
      _internalEventMode: child?._internalEventMode ?? null,
      bounds: getBoundsSafe(child),
      listeners: child?.listeners
        ? {
            pointerdown: child.listeners("pointerdown")?.length ?? 0,
            pointerup: child.listeners("pointerup")?.length ?? 0,
            pointertap: child.listeners("pointertap")?.length ?? 0,
            click: child.listeners("click")?.length ?? 0,
            tap: child.listeners("tap")?.length ?? 0,
          }
        : null,
    }));
  };

  window.__pixiText = function (path) {
    const obj = window.__getPixiByPath(path);
    if (!obj) return "";
    return collectText(obj);
  };

  window.__pixiFind = function (predicateString) {
    const stage = getStage();
    if (!stage) return [];

    const results = [];

    const predicate = new Function(
      "node",
      "path",
      "collectText",
      "getBoundsSafe",
      `return (${predicateString});`
    );

    function walk(node, path) {
      if (!node) return;

      try {
        if (predicate(node, path, collectText, getBoundsSafe)) {
          results.push({
            path,
            name: node?.name ?? null,
            label: node?.label ?? null,
            type: node?.type ?? node?.constructor?.name ?? null,
            text: collectText(node),
            visible: node?.visible,
            renderable: node?.renderable,
            alpha: node?.alpha,
            worldAlpha: node?.worldAlpha,
            interactive: node?.interactive,
            buttonMode: node?.buttonMode,
            eventMode: node?.eventMode,
            cursor: node?.cursor ?? null,
            _internalInteractive: node?._internalInteractive ?? null,
            _internalEventMode: node?._internalEventMode ?? null,
            bounds: getBoundsSafe(node),
            listeners: node?.listeners
              ? {
                  pointerdown: node.listeners("pointerdown")?.length ?? 0,
                  pointerup: node.listeners("pointerup")?.length ?? 0,
                  pointertap: node.listeners("pointertap")?.length ?? 0,
                  click: node.listeners("click")?.length ?? 0,
                  tap: node.listeners("tap")?.length ?? 0,
                }
              : null,
          });
        }
      } catch {
        // ignore predicate errors on individual nodes
      }

      (node.children || []).forEach((child, i) => {
        walk(child, `${path}.children[${i}]`);
      });
    }

    walk(stage, "stage");
    return results;
  };

  window.__emitPixiClickByPath = function (path, opts = {}) {
    const target = window.__getPixiByPath(path);

    if (!target) {
      throw new Error(`No target found at path: ${path}`);
    }

    const global = opts.global || getCenterGlobal(target);

    const fakeEvent = (type) => ({
      type,
      target,
      currentTarget: target,
      global,

      // Pixi-style pointer fields
      button: 0,
      buttons: type === "pointerdown" || type === "mousedown" ? 1 : 0,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,

      // Older Pixi interaction style
      data: {
        global,
        button: 0,
        buttons: type === "pointerdown" || type === "mousedown" ? 1 : 0,
        getLocalPosition: (container) => {
          try {
            return container?.toLocal
              ? container.toLocal(global)
              : { x: 0, y: 0 };
          } catch {
            return { x: 0, y: 0 };
          }
        },
      },

      stopPropagation() {},
      preventDefault() {},
    });

    const events = opts.events || [
      "pointerover",
      "pointermove",
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
      "pointertap",
      "tap",
      "click",
    ];

    const emitted = [];

    for (const eventName of events) {
      try {
        target.emit?.(eventName, fakeEvent(eventName));
        emitted.push(eventName);
      } catch (err) {
        console.warn("Emit failed:", eventName, err);
      }
    }

    const result = {
      clicked: true,
      path,
      emitted,
      name: target.name ?? null,
      label: target.label ?? null,
      type: target.constructor?.name ?? null,
      eventMode: target.eventMode ?? null,
      interactive: target.interactive ?? null,
      cursor: target.cursor ?? null,
      global,
      bounds: getBoundsSafe(target),
      listeners: target.listeners
        ? {
            pointerover: target.listeners("pointerover")?.length ?? 0,
            pointermove: target.listeners("pointermove")?.length ?? 0,
            pointerdown: target.listeners("pointerdown")?.length ?? 0,
            pointerup: target.listeners("pointerup")?.length ?? 0,
            pointertap: target.listeners("pointertap")?.length ?? 0,
            click: target.listeners("click")?.length ?? 0,
            tap: target.listeners("tap")?.length ?? 0,
            mousedown: target.listeners("mousedown")?.length ?? 0,
            mouseup: target.listeners("mouseup")?.length ?? 0,
          }
        : null,
    };

    console.log("✅ emitPixiClickByPath result:", result);
    return result;
  };

  window.__pixiFindWithListeners = function () {
    return window.__pixiFind(`
      node.visible !== false &&
      node.renderable !== false &&
      (node.worldAlpha ?? node.alpha ?? 1) > 0 &&
      node.listeners &&
      (
        node.listeners("pointertap").length ||
        node.listeners("pointerdown").length ||
        node.listeners("pointerup").length ||
        node.listeners("click").length ||
        node.listeners("tap").length ||
        node.listeners("mousedown").length ||
        node.listeners("mouseup").length
      )
    `);
  };

  console.log("✅ Pixi debug helpers installed");
  console.log("Available:");
  console.log("__getPixiByPath(path)");
  console.log("__pixiState(path)");
  console.log("__pixiChildren(path)");
  console.log("__pixiText(path)");
  console.log("__pixiFind(predicateString)");
  console.log("__pixiFindWithListeners()");
  console.log("__emitPixiClickByPath(path, opts)");
})();