//This code works for IWG game 
import { test, expect, Page, Frame } from "@playwright/test";
import fs from "fs";
import path from "path";

const GAME_URL = "https://mylotto.co.nz/instant-kiwi";

test("record Pixi object paths for object model", async ({ page }) => {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

  // Change this launch step per game
  await page.getByRole("button", { name: "TRY" }).nth(27).click();

  const gameFrame = await getGameFrame(page);

  await expect(gameFrame.locator("canvas")).toBeVisible();

  await injectPixiRecorder(gameFrame);

  console.log("");
  console.log("🎮 Pixi recorder is active.");
  console.log("Hover over Pixi buttons/objects in the game.");
  console.log("Then in the browser console, run: for example:");
  console.log('__pixiRecord("tryButton", "home")');
  console.log("until you've reached the end");
  console.log("");
  console.log("to finish run __pixiExport() and exit");
  console.log("");

  console.log("Recorder ready. Use browser console to record paths, then click Resume in Playwright Inspector.");
  await page.pause();


  const records = await gameFrame.evaluate(() => {
    return (window as any).__pixiRecorderRecords || [];
  });

  const outputDir = path.join(process.cwd(), "pixi-objects");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "instant-kiwi.objects.json");

  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));

  console.log(`✅ Saved ${records.length} Pixi records to:`);
  console.log(outputPath);

  expect(records.length).toBeGreaterThan(0);
});

async function getGameFrame(page: Page): Promise<Frame> {
  const iframeHandle = await page
    .locator('iframe[title="Instant Kiwi Game"]')
    .elementHandle();

  if (!iframeHandle) {
    throw new Error("Instant Kiwi Game iframe not found");
  }

  const gameFrame = await iframeHandle.contentFrame();

  if (!gameFrame) {
    throw new Error("Instant Kiwi Game iframe contentFrame not available");
  }

  return gameFrame;
}


async function injectPixiRecorder(gameFrame: Frame) {
  await gameFrame.evaluate(() => {
    if ((window as any).__pixiRecorderInstalled) {
      console.log("Pixi recorder already installed.");
      return;
    }

    (window as any).__pixiRecorderInstalled = true;
    (window as any).__pixiRecorderRecords = [];

    let lastHoveredPath: string | null = null;
    let lastHoveredObject: any = null;

    const highlight = document.createElement("div");

    highlight.style.position = "fixed";
    highlight.style.border = "4px solid red";
    highlight.style.background = "rgba(255,0,0,0.08)";
    highlight.style.pointerEvents = "none";
    highlight.style.zIndex = "999999";
    highlight.style.boxSizing = "border-box";
    highlight.style.display = "none";

    document.body.appendChild(highlight);

    function getApp() {
      return (
        (window as any).pixi_app ||
        (window as any).__PIXI_APP__ ||
        (window as any).app ||
        null
      );
    }

    function getStageFromObject(obj: any) {
      let current = obj;

      while (current?.parent) {
        current = current.parent;
      }

      return current || null;
    }

    function getDisplayPath(obj: any) {
      const parts: string[] = [];
      let current = obj;

      while (current) {
        const parent = current.parent;

        if (!parent) {
          parts.unshift("stage");
          break;
        }

        const index = parent.children?.indexOf(current);

        if (index >= 0) {
          parts.unshift(`children[${index}]`);
        } else {
          parts.unshift("children[?]");
        }

        current = parent;
      }

      return parts.join(".");
    }

    function isVisible(node: any) {
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

    function isUI(node: any) {
      if (!node) return false;

      const name = (node.name || "").toLowerCase();
      const type = node.constructor?.name;

      return Boolean(
        node.interactive ||
          node.cursor === "pointer" ||
          node.buttonMode ||
          node.eventMode === "static" ||
          node.eventMode === "dynamic" ||
          node.listeners?.("pointertap")?.length ||
          node.listeners?.("click")?.length ||
          node.listeners?.("tap")?.length ||
          type === "Text" ||
          type === "BitmapText" ||
          typeof node.text === "string" ||
          /button|btn|label|tab|play|try|draw|close|confirm|auto/i.test(name)
      );
    }

    function getBoundsSafe(node: any) {
      try {
        const b = node?.getBounds?.();

        if (!b || b.width <= 0 || b.height <= 0) {
          return null;
        }

        return b;
      } catch {
        return null;
      }
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

    function moveHighlight(bounds: any) {
      const canvas = document.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();

      if (!canvas || !rect) {
        highlight.style.left = bounds.x + "px";
        highlight.style.top = bounds.y + "px";
        highlight.style.width = bounds.width + "px";
        highlight.style.height = bounds.height + "px";
        highlight.style.display = "block";
        return;
      }

      const scaleX = rect.width / (canvas as HTMLCanvasElement).width;
      const scaleY = rect.height / (canvas as HTMLCanvasElement).height;

      highlight.style.left = rect.left + bounds.x * scaleX + "px";
      highlight.style.top = rect.top + bounds.y * scaleY + "px";
      highlight.style.width = bounds.width * scaleX + "px";
      highlight.style.height = bounds.height * scaleY + "px";
      highlight.style.display = "block";
    }

    function saveHoveredTarget(obj: any, path: string, bounds: any, mode: string) {
      lastHoveredObject = obj;
      lastHoveredPath = path;

      (window as any).__pixiTarget = obj;
      (window as any).__pixiPath = path;
      (window as any).__pixiBounds = bounds;
      (window as any).__pixiStage =
        getStageFromObject(obj) || (window as any).__pixiStage;

      moveHighlight(bounds);

      console.clear();
      console.log(`🎯 PIXI HOVERED — ${mode}`);
      console.log("Path:", path);
      console.log("Text:", collectPixiText(obj));
      console.log("Bounds:", bounds);
      console.log("To save this object, run:");
      console.log('__pixiRecord("objectName", "screenName")');
      console.log("To emit click directly, run:");
      console.log(`emitClickByPath("${path}")`);
    }

    function recordCurrentTarget(name: string, screen = "unknown") {
      const target = (window as any).__pixiTarget;
      const pixiPath = (window as any).__pixiPath;

      if (!target || !pixiPath) {
        console.warn("No Pixi target saved. Hover an object first.");
        return null;
      }

      const b = getBoundsSafe(target);

      if (!b) {
        console.warn("Target has no valid bounds.");
        return null;
      }

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

      const records = (window as any).__pixiRecorderRecords;

      const existingIndex = records.findIndex(
        (item: any) => item.name === name && item.screen === screen
      );

      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        records.push(record);
      }

      console.log("✅ Recorded Pixi object:", record);
      console.table(
        records.map((r: any) => ({
          screen: r.screen,
          name: r.name,
          path: r.path,
          text: r.text,
        }))
      );

      return record;
    }

    (window as any).__pixiRecord = recordCurrentTarget;

    (window as any).__pixiExport = function exportPixiRecords() {
      const records = (window as any).__pixiRecorderRecords || [];
      console.log(JSON.stringify(records, null, 2));
      return records;
    };

    (window as any).__pixiClearRecords = function clearPixiRecords() {
      (window as any).__pixiRecorderRecords = [];
      console.log("Cleared Pixi recorder records.");
    };

    (window as any).getPixiByPath = function getPixiByPath(path: string) {
      const app = getApp();

      if (app?.stage) {
        (window as any).__pixiStage = app.stage;
      }

      const stage = (window as any).__pixiStage;

      if (!stage) {
        throw new Error(
          "No Pixi stage found. Hover an object first, or expose window.__PIXI_APP__ / window.pixi_app."
        );
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

    (window as any).emitClickByPath = function emitClickByPath(path: string) {
      const target = (window as any).getPixiByPath(path);

      if (!target) {
        throw new Error(`Pixi object not found for path: ${path}`);
      }

      const eventPayload = {
        target,
        currentTarget: target,
        type: "pointertap",
      };

      console.log("Emitting click events on Pixi object:", {
        path,
        target,
        bounds: target.getBounds?.(),
      });

      target.emit?.("pointerdown", {
        ...eventPayload,
        type: "pointerdown",
      });

      target.emit?.("pointerup", {
        ...eventPayload,
        type: "pointerup",
      });

      target.emit?.("pointertap", {
        ...eventPayload,
        type: "pointertap",
      });

      target.emit?.("tap", {
        ...eventPayload,
        type: "tap",
      });

      target.emit?.("click", {
        ...eventPayload,
        type: "click",
      });

      return true;
    };

    function initNewMode(app: any) {
      if (!app?.stage) return false;

      (window as any).__pixiStage = app.stage;

      function scan(node: any, results: any[] = [], path = "stage") {
        if (!node) return results;

        const bounds = getBoundsSafe(node);

        if (isUI(node) && isVisible(node) && bounds) {
          results.push({ node, path, bounds });
        }

        node.children?.forEach((child: any, i: number) => {
          scan(child, results, `${path}.children[${i}]`);
        });

        return results;
      }

      function getTopHit(x: number, y: number) {
        const hits = scan(app.stage);
        let top = null;

        for (const item of hits) {
          const b = item.bounds;

          const inside =
            x >= b.x &&
            x <= b.x + b.width &&
            y >= b.y &&
            y <= b.y + b.height;

          if (inside) {
            top = item;
          }
        }

        return top;
      }

      window.addEventListener("mousemove", (e) => {
        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;

        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const pixiX = (e.clientX - rect.left) * scaleX;
        const pixiY = (e.clientY - rect.top) * scaleY;

        const hit = getTopHit(pixiX, pixiY);
        const path = hit?.path;

        if (path && path !== lastHoveredPath) {
          saveHoveredTarget(hit.node, hit.path, hit.bounds, "NEW MODE");
        }

        if (!hit) {
          highlight.style.display = "none";
        }
      });

      console.log("🟢 Pixi recorder NEW MODE active.");
      return true;
    }

    function initOldMode() {
      const PIXI = (window as any).PIXI;

      const InteractionManager =
        PIXI?.interaction?.InteractionManager ||
        PIXI?.InteractionManager;

      if (!InteractionManager) return false;

      const proto = InteractionManager.prototype;

      if (proto.__pixiRecorderOldModeInstalled) {
        console.log("🟡 Pixi recorder OLD MODE already active.");
        return true;
      }

      const original = proto.processInteractive;

      proto.processInteractive = function (...args: any[]) {
        const event = args[0];
        const obj = args[1];

        try {
          if (obj && obj.getBounds && isUI(obj) && isVisible(obj)) {
            const b = getBoundsSafe(obj);
            const mouse = event?.data?.global;

            if (b && mouse) {
              const inside =
                mouse.x >= b.x &&
                mouse.x <= b.x + b.width &&
                mouse.y >= b.y &&
                mouse.y <= b.y + b.height;

              if (inside && lastHoveredObject !== obj) {
                const pixiPath = getDisplayPath(obj);
                saveHoveredTarget(obj, pixiPath, b, "OLD MODE");
              }
            }
          }
        } catch {
          // ignore traversal errors
        }

        return original.call(this, ...args);
      };

      proto.__pixiRecorderOldModeInstalled = true;

      console.log("🟡 Pixi recorder OLD MODE active.");
      return true;
    }

    const app = getApp();

    if (initNewMode(app)) {
      console.log("✅ Pixi recorder installed.");
    } else if (initOldMode()) {
      console.log("✅ Pixi recorder installed.");
    } else {
      console.error("❌ No compatible Pixi mode found.");
      console.log(
        "Expected window.pixi_app, window.__PIXI_APP__, window.app, or PIXI InteractionManager."
      );
    }

    console.log("Commands:");
    console.log('__pixiRecord("objectName", "screenName")');
    console.log("__pixiExport()");
    console.log("__pixiClearRecords()");
    console.log('emitClickByPath("stage.children[0]")');
  });
}