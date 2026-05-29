import { expect, Frame, Page } from '@playwright/test';

export async function getPixiObjectState(gameFrame: Frame, path: string) {
  return await gameFrame.evaluate((path) => {
    const target = (window as any).__getPixiByPath(path);

    if (!target) return null;

    let b;

    try {
      b = target.getBounds();
    } catch {
      return null;
    }

    if (!b) return null;

    return {
      exists: true,
      visible: target.visible,
      renderable: target.renderable,
      alpha: target.alpha,
      worldAlpha: target.worldAlpha,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      text: (window as any).__collectPixiText?.(target) ?? "",
      interactive: target.interactive,
      buttonMode: target.buttonMode,
      eventMode: target.eventMode,
      cursor: target.cursor ?? null,
      name: target.name ?? null,
    };
  }, path);
}

export async function pixiObjectExists(gameFrame: Frame, path: string) {
  const state = await getPixiObjectState(gameFrame, path);
  return Boolean(state && state.exists && state.width > 0 && state.height > 0);
}

export async function expectPixiObjectVisible(gameFrame: Frame, path: string) {
  const state = await getPixiObjectState(gameFrame, path);

  expect(state, `Pixi object should exist: ${path}`).not.toBeNull();
  expect(state!.visible, `Pixi object should be visible: ${path}`).toBe(true);
  expect(state!.renderable, `Pixi object should be renderable: ${path}`).not.toBe(false);
  expect(state!.worldAlpha, `Pixi object should not be transparent: ${path}`).toBeGreaterThan(0);
  expect(state!.width, `Pixi object should have width: ${path}`).toBeGreaterThan(0);
  expect(state!.height, `Pixi object should have height: ${path}`).toBeGreaterThan(0);
}


export async function clickPixiObjectByPath(
  page: Page,
  gameFrame: Frame,
  path: string
) {
  const point = await gameFrame.evaluate((path) => {
    const target = (window as any).__getPixiByPath(path);

    if (!target) {
      throw new Error(`Pixi object not found: ${path}`);
    }

    const b = target.getBounds();
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;

    return {
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
  }, path);

  const canvasBox = await gameFrame.locator("canvas").boundingBox();

  if (!canvasBox) {
    throw new Error("Canvas bounding box not found");
  }

  const scaleX = canvasBox.width / point.canvasWidth;
  const scaleY = canvasBox.height / point.canvasHeight;

  const clickX = canvasBox.x + point.x * scaleX;
  const clickY = canvasBox.y + point.y * scaleY;

  await page.mouse.click(clickX, clickY);
}

export async function injectPixiStageCapture(gameFrame: Frame) {
  await gameFrame.evaluate(() => {
    const InteractionManager =
      (window as any).PIXI?.interaction?.InteractionManager ||
      (window as any).PIXI?.InteractionManager;

    if (!InteractionManager) {
      throw new Error("Pixi InteractionManager not found in iframe");
    }

    const proto = InteractionManager.prototype;

    if (proto.__pixiStageCaptureInstalled) {
      return;
    }

    const original = proto.processInteractive;

    function getStageFromObject(obj: any) {
      let current = obj;

      while (current?.parent) {
        current = current.parent;
      }

      return current;
    }

    function collectPixiText(obj: any, texts: string[] = []) {
      if (!obj) return "";

      if (typeof obj.text === "string") {
        texts.push(obj.text);
      }

      for (const child of obj.children || []) {
        collectPixiText(child, texts);
      }

      return texts.join(" ");
    }

    proto.processInteractive = function (...args: any[]) {
      const obj = args[1];

      try {
        if (obj?.getBounds) {
          (window as any).__pixiStage = getStageFromObject(obj);
          (window as any).__lastPixiObject = obj;
        }
      } catch {
        // ignore Pixi traversal errors
      }

      return original.call(this, ...args);
    };

    proto.__pixiStageCaptureInstalled = true;

    (window as any).__getPixiByPath = function getPixiByPath(path: string) {
      const stage = (window as any).__pixiStage;

      if (!stage) {
        throw new Error("Pixi stage not captured yet. Move mouse over the canvas first.");
      }

      let current = stage;

      const parts = path
        .replace(/^stage\.?/, "")
        .split(".")
        .filter(Boolean);

      for (const part of parts) {
        const match = part.match(/^children\[(\d+)\]$/);

        if (!match) {
          throw new Error(`Unsupported Pixi path part: ${part}`);
        }

        current = current.children?.[Number(match[1])];

        if (!current) return null;
      }

      return current;
    };

    (window as any).__collectPixiText = collectPixiText;
  });
}
export async function waitForPixiObjectVisible(
  gameFrame: Frame,
  path: string,
  timeout = 10000
) {
  await expect
    .poll(
      async () => {
        const state = await getPixiObjectState(gameFrame, path).catch(() => null);

        return Boolean(
          state &&
            state.exists &&
            state.visible &&
            state.renderable !== false &&
            state.worldAlpha > 0 &&
            state.width > 0 &&
            state.height > 0
        );
      },
      {
        timeout,
        message: `Waiting for Pixi object to be visible: ${path}`,
      }
    )
    .toBe(true);
}

export async function ensurePixiHelpers(frame: Frame) {
  // ✅ wait for stage first
  await expect.poll(async () => {
    return await frame.evaluate(() => {
      const w = window as any;
      return Boolean(
        w.__PIXI_STAGE__ ||
        w.__pixiStage ||
        w.__PIXI_APP__?.stage
      );
    });
  }, { timeout: 10000 }).toBe(true);

  // ✅ inject helper
  await frame.evaluate(() => {
    if ((window as any).__getPixiByPath) return;

    function getStage() {
      const w = window as any;

      return (
        w.__PIXI_STAGE__ ||
        w.__PIXI_APP__?.stage ||
        w.__pixiStage ||
        null
      );
    }

    (window as any).__getPixiByPath = function (path: string) {
      let current = getStage();
      if (!current) return null;

      const parts = path.replace(/^stage\.?/, "").split(".").filter(Boolean);

      for (const part of parts) {
        const match = part.match(/^children\[(\d+)\]$/);
        if (!match) return null;

        current = current.children?.[Number(match[1])];
        if (!current) return null;
      }

      return current;
    };
  });
}

export async function waitForPixiObjectInteractable(
  gameFrame: Frame,
  path: string,
  timeout = 10000
) {
  await expect
    .poll(
      async () => {
        const state = await getPixiObjectState(gameFrame, path).catch(() => null);

        return Boolean(
          state &&
            state.exists &&
            state.visible !== false &&
            state.renderable !== false &&
            state.worldAlpha > 0 &&
            state.width > 0 &&
            state.height > 0 &&
            (
              state.interactive === true ||
              state.buttonMode === true ||
              state.eventMode === "static" ||
              state.eventMode === "dynamic" ||
              state.cursor === "pointer"
            )
        );
      },
      {
        timeout,
        message: `Waiting for Pixi object to be interactable: ${path}`,
      }
    )
    .toBe(true);
}
export async function waitForPixiObjectReadyToClick(
  
gameFrame: Frame,
  path: string,
  timeout = 10000
) {
  await expect
    .poll(
      async () => {
        const state = await getPixiObjectState(gameFrame, path).catch(() => null);

        return Boolean(
          state &&
            state.exists &&
            state.visible !== false &&
            state.renderable !== false &&
            state.worldAlpha > 0 &&     // ✅ became visible
            state.width > 0 &&
            state.height > 0 &&
            state.y >= 0 &&             // ✅ moved on screen
            state.interactive === true &&  // ✅ now clickable
            state.eventMode === "static" && // ✅ reliable signal
            state.cursor === "pointer"     // ✅ final confirmation
        );
      },
      {
        timeout,
        message: `Waiting for Pixi object to be fully clickable: ${path}`,
      }
    )
    .toBe(true);
}


export async function waitPixiObjectOnScreen(
  gameFrame: Frame,
  path: string,
  timeout = 10000
) {
  await expect
    .poll(
      async () => {
        const state = await getPixiObjectState(gameFrame, path).catch(() => null);

        return Boolean(
          state &&
            state.exists &&
            state.visible !== false &&
            state.renderable !== false &&
            state.width > 0 &&
            state.height > 0 &&
            state.worldAlpha > 0 &&  // ✅ visible on canvas
            state.y >= 0             // ✅ not off-screen
        );
      },
      {
        timeout,
        message: `Waiting for Pixi object to be on screen: ${path}`,
      }
    )
    .toBe(true);
}
export async function isActiveTile(state: any) {
  if (!state || !state.exists) return false;

  const interactive = state._internalInteractive ?? state.interactive;
  const eventMode = state._internalEventMode ?? state.eventMode;

  return (
    state.worldAlpha > 0 &&
    interactive === true &&
    eventMode === "static"
  );
}

