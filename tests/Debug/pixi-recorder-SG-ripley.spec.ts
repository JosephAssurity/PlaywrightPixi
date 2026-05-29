
import { test, expect, Page, Frame } from "@playwright/test";
import fs from "fs";
import path from "path";
import { clickGameButton } from "../helpers/lobbyHelpers";

const GAME_URL = "https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games";

test("record Pixi object paths for object model", async ({ page }) => {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

  // Change this launch step per game
  await clickGameButton(page, 'Bubble Busters', 'TRY');

  const gameFrame = await getGameFrame(page);

  await expect(gameFrame.locator("canvas")).toBeVisible();

  await injectVendorRecorder(gameFrame);

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

async function injectVendorRecorder(frame: Frame) {
  await frame.evaluate(() => {
    if ((window as any).__pixiRecorderInstalled) return;
    (window as any).__pixiRecorderInstalled = true;

    const records: any[] = [];
    (window as any).__pixiRecorderRecords = records;

    let lastHoveredPath: string | null = null;
    let lastHoveredObject: any = null;

    // ----------------------------
    // Highlight overlay
    // ----------------------------
    const highlight = document.createElement("div");
    highlight.style.position = "fixed";
    highlight.style.border = "3px solid red";
    highlight.style.background = "rgba(255,0,0,0.1)";
    highlight.style.pointerEvents = "none";
    highlight.style.zIndex = "999999";
    highlight.style.display = "none";

    document.body.appendChild(highlight);

    // ----------------------------
    // Helpers
    // ----------------------------

    function getStage() {
      const w = window as any;

      // ✅ BEST: direct app access
      if (w.__PIXI_APP__?.stage) {
        return w.__PIXI_APP__.stage;
   }

  // ✅ fallbacks
     return (
        w.__pixiStage ||
        w.__PIXI_STAGE__ ||
        null
  );
}


    function isUI(node: any) {
      if (!node) return false;

      // 👑 Primary signal
      if (node._interactable === true) return true;

      return Boolean(
        node.interactive ||
        node.buttonMode ||
        node.eventMode === "static" ||
        node.eventMode === "dynamic"
      );
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

    function getBoundsSafe(node: any) {
      try {
        const b = node.getBounds();
        return b && b.width > 0 && b.height > 0 ? b : null;
      } catch {
        return null;
      }
    }

    function getPath(obj: any) {
      const parts: string[] = [];
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

    function collectText(node: any, texts: string[] = []) {
      if (!node) return "";

      if (typeof node.text === "string") {
        texts.push(node.text);
      }

      for (const child of node.children || []) {
        collectText(child, texts);
      }

      return texts.join(" ");
    }

    // ----------------------------
    // Stage fallback auto-capture
    // ----------------------------
    window.addEventListener("mousemove", () => {
      if (!(window as any).__pixiStage && (window as any).__pixiTarget) {
        try {
          let current = (window as any).__pixiTarget;
          while (current?.parent) current = current.parent;
          (window as any).__pixiStage = current;
        } catch {}
      }
    });

    // ----------------------------
    // Recursive scan (throttled)
    // ----------------------------
    let lastScan = 0;
    let cachedHits: any[] = [];

    function scan(node: any, results: any[] = [], path = "stage") {
      if (!node) return results;

      const bounds = getBoundsSafe(node);

      if (bounds && isUI(node) && isVisible(node)) {
        results.push({ node, path, bounds });
      }

      node.children?.forEach((child: any, i: number) => {
        scan(child, results, `${path}.children[${i}]`);
      });

      return results;
    }

    function getHits() {
      const now = Date.now();

      if (now - lastScan > 100) {
        const stage = getStage();
        if (!stage) return [];

        cachedHits = scan(stage);
        lastScan = now;
      }

      return cachedHits;
    }

    // ----------------------------
    // Find top-most object
    // ----------------------------
    function getTopHit(x: number, y: number) {
      const hits = getHits();

      let top = null;

      for (const item of hits) {
        const b = item.bounds;

        const inside =
          x >= b.x &&
          x <= b.x + b.width &&
          y >= b.y &&
          y <= b.y + b.height;

        if (inside) {
          if (
            !top ||
            b.width * b.height < top.bounds.width * top.bounds.height
          ) {
            top = item;
          }
        }
      }

      return top;
    }

    // ----------------------------
    // Mouse tracking
    // ----------------------------

    window.addEventListener("mousemove", (e) => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const hit = getTopHit(e.clientX, e.clientY); // ✅ NO SCALING
      const path = hit?.path;

      if (path && path !== lastHoveredPath) {
        lastHoveredPath = path;
        lastHoveredObject = hit.node;

        (window as any).__pixiPath = path;
        (window as any).__pixiTarget = hit.node;

        const b = hit.bounds;

        // ✅ SIMPLE positioning (screen-space bounds)
        highlight.style.left = b.x + "px";
        highlight.style.top = b.y + "px";
        highlight.style.width = b.width + "px";
        highlight.style.height = b.height + "px";
        highlight.style.display = "block";

        console.clear();
        console.log("🎯 Hovered Pixi Object");
        console.log("Path:", path);
        console.log("Text:", collectText(hit.node));
        console.log('Run: __pixiRecord("name", "screen")');
      }

      if (!hit) {
        highlight.style.display = "none";
      }
    });


    // ----------------------------
    // Recording API
    // ----------------------------
    (window as any).__pixiRecord = (name: string, screen = "unknown") => {
      if (!lastHoveredObject) {
        console.warn("No hovered object");
        return;
      }

      const path = lastHoveredPath!;
      const bounds = getBoundsSafe(lastHoveredObject);

      const record = {
        name,
        screen,
        path,
        text: collectText(lastHoveredObject),
        bounds,
      };

      const existing = records.findIndex(
        (r) => r.name === name && r.screen === screen
      );

      if (existing >= 0) {
        records[existing] = record;
      } else {
        records.push(record);
      }

      console.log("✅ Recorded:", record);
      console.table(records);

      return record;
    };

    (window as any).__pixiExport = () => {
      console.log(JSON.stringify(records, null, 2));
      return records;
    };

    (window as any).__pixiClick = () => {
      if (!lastHoveredObject) return;

      lastHoveredObject.emit?.("pointertap");
      lastHoveredObject.emit?.("click");

      console.log("✅ Click emitted");
    };

    (window as any).__copyPath = () => {
      navigator.clipboard.writeText(lastHoveredPath || "");
      console.log("📋 Copied:", lastHoveredPath);
    };

    console.log("✅ Vendor Pixi Recorder Ready");
  });
}
