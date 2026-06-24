
import { test, expect, Page, Frame } from "@playwright/test";
import fs from "fs";
import path from "path";
import { clickGameButton } from "../helpers/lobbyHelpers";

const GAME_URL = "https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games";

test("record Pixi object paths for object model", async ({ page }) => {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

  // Change this launch step per game
  await clickGameButton(page, 'MONOPOLY Property Payout', 'TRY');

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

    let lastPrimaryPath: string | null = null;
    let lastPrimaryObject: any = null;

    let lastSecondaryPath: string | null = null;
    let lastSecondaryObject: any = null;

    // ----------------------------
    // Highlight overlays
    // ----------------------------
    function createOverlay(border: string, fill: string) {
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.pointerEvents = "none";
      el.style.zIndex = "999999";
      el.style.border = `3px solid ${border}`;
      el.style.background = fill;
      el.style.display = "none";
      document.body.appendChild(el);
      return el;
    }

    // Primary = red
    const primaryHighlight = createOverlay("red", "rgba(255, 0, 0, 0.10)");

    // Secondary = cyan / blue
    const secondaryHighlight = createOverlay("cyan", "rgba(0, 170, 255, 0.10)");

    // ----------------------------
    // Helpers
    // ----------------------------
    function getStage() {
      const w = window as any;

      if (w.__PIXI_APP__?.stage) {
        return w.__PIXI_APP__.stage;
      }

      return w.__pixiStage || w.__PIXI_STAGE__ || null;
    }

    function isUI(node: any) {
      if (!node) return false;

      if (node._interactable === true) return true;

      return Boolean(
        node.interactive ||
          node.buttonMode ||
          node.eventMode === "static" ||
          node.eventMode === "dynamic" ||
          node._internalInteractive === true ||
          node._internalEventMode === "static" ||
          node._internalEventMode === "dynamic"
      );
    }

    function isVisible(node: any) {
      let current = node;

      while (current) {
        if (
          current.visible === false ||
          current.renderable === false ||
          (current.alpha ?? 1) <= 0 ||
          (current.worldAlpha ?? 1) <= 0
        ) {
          return false;
        }

        current = current.parent;
      }

      return true;
    }

    function getBoundsSafe(node: any) {
      try {
        const b = node.getBounds?.();
        return b && b.width > 0 && b.height > 0 ? b : null;
      } catch {
        return null;
      }
    }

    function collectText(node: any, texts: string[] = []) {
      if (!node) return "";

      if (typeof node.text === "string" && node.text.trim().length > 0) {
        texts.push(node.text.trim());
      }

      for (const child of node.children || []) {
        collectText(child, texts);
      }

      return texts.join(" ").trim();
    }

    function area(bounds: any) {
      return bounds.width * bounds.height;
    }

    function showOverlay(el: HTMLDivElement, bounds: any) {
      el.style.left = `${bounds.x}px`;
      el.style.top = `${bounds.y}px`;
      el.style.width = `${bounds.width}px`;
      el.style.height = `${bounds.height}px`;
      el.style.display = "block";
    }

    function hideOverlay(el: HTMLDivElement) {
      el.style.display = "none";
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

    function scan(node: any, results: any[] = [], path = "stage", depth = 0) {
      if (!node) return results;

      const bounds = getBoundsSafe(node);
      const text = collectText(node);
      const hasText = text.length > 0;
      const ui = isUI(node);

      if (bounds && isVisible(node) && (ui || hasText)) {
        results.push({
          node,
          path,
          bounds,
          text,
          hasText,
          ui,
          depth,
        });
      }

      node.children?.forEach((child: any, i: number) => {
        scan(child, results, `${path}.children[${i}]`, depth + 1);
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
    // Candidate picking
    // ----------------------------
    function getCandidates(x: number, y: number) {
      const hits = getHits().filter((item) => {
        const b = item.bounds;
        return (
          x >= b.x &&
          x <= b.x + b.width &&
          y >= b.y &&
          y <= b.y + b.height
        );
      });

      if (!hits.length) return { primary: null, secondary: null };

      const textHits = hits
        .filter((h) => h.hasText)
        .sort((a, b) => {
          const areaDiff = area(a.bounds) - area(b.bounds);
          if (areaDiff !== 0) return areaDiff;
          return b.depth - a.depth;
        });

      const uiHits = hits
        .filter((h) => h.ui)
        .sort((a, b) => {
          const areaDiff = area(a.bounds) - area(b.bounds);
          if (areaDiff !== 0) return areaDiff;
          return b.depth - a.depth;
        });

      // ✅ Primary: prefer container with text
      const primary = textHits[0] || uiHits[0] || null;

      // ✅ Secondary: prefer a different useful candidate
      let secondary = null;

      if (primary) {
        secondary =
          uiHits.find((h) => h.path !== primary.path) ||
          textHits.find((h) => h.path !== primary.path) ||
          null;
      }

      return { primary, secondary };
    }

    // ----------------------------
    // Mouse tracking
    // ----------------------------
    window.addEventListener("mousemove", (e) => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const { primary, secondary } = getCandidates(e.clientX, e.clientY);

      if (primary) {
        lastPrimaryPath = primary.path;
        lastPrimaryObject = primary.node;

        (window as any).__pixiPath = primary.path;
        (window as any).__pixiTarget = primary.node;

        showOverlay(primaryHighlight, primary.bounds);
      } else {
        lastPrimaryPath = null;
        lastPrimaryObject = null;
        hideOverlay(primaryHighlight);
      }

      if (secondary) {
        lastSecondaryPath = secondary.path;
        lastSecondaryObject = secondary.node;

        (window as any).__pixiAltPath = secondary.path;
        (window as any).__pixiAltTarget = secondary.node;

        showOverlay(secondaryHighlight, secondary.bounds);
      } else {
        lastSecondaryPath = null;
        lastSecondaryObject = null;
        hideOverlay(secondaryHighlight);
      }

      if (!primary && !secondary) {
        console.clear();
        console.log("No Pixi UI/text hit under cursor");
        return;
      }

      console.clear();
      console.log("🎯 Hovered Pixi Candidates");

      if (primary) {
        console.log("PRIMARY (RED):", {
          path: primary.path,
          text: primary.text,
          ui: primary.ui,
          hasText: primary.hasText,
        });
      }

      if (secondary) {
        console.log("SECONDARY (CYAN):", {
          path: secondary.path,
          text: secondary.text,
          ui: secondary.ui,
          hasText: secondary.hasText,
        });
      }

      console.log('Run: __pixiRecord("name", "screen")');
      console.log('Or:  __pixiRecordAlt("name", "screen")');
    });

    // ----------------------------
    // Recording APIs
    // ----------------------------
    (window as any).__pixiRecord = (name: string, screen = "unknown") => {
      if (!lastPrimaryObject || !lastPrimaryPath) {
        console.warn("No PRIMARY hovered object");
        return;
      }

      const bounds = getBoundsSafe(lastPrimaryObject);

      const record = {
        name,
        screen,
        path: lastPrimaryPath,
        text: collectText(lastPrimaryObject),
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

      console.log("✅ Recorded PRIMARY:", record);
      console.table(records);

      return record;
    };
    (window as any).__pixiDumpVisibleText = () => {
      const stage = getStage();
      if (!stage) {
        console.warn("No Pixi stage found");
        return [];
      }

      const results: any[] = [];

      function walk(node: any, path = "stage", depth = 0) {
        if (!node) return;

        const bounds = getBoundsSafe(node);
        const text = collectText(node).trim();

        if (bounds && isVisible(node) && text.length > 0) {
          results.push({
            path,
            text,
            name: node.name ?? null,
            depth,
            bounds,
          });
        }

        node.children?.forEach((child: any, i: number) => {
          walk(child, `${path}.children[${i}]`, depth + 1);
        });
      }

      walk(stage);

      console.table(results);
      return results;
    };
    
    (window as any).__pixiFindText = (needle: string) => {
      const stage = getStage();
      if (!stage) {
        console.warn("No Pixi stage found");
        return [];
      }

      const query = String(needle).toLowerCase().trim();
      const results: any[] = [];

      function walk(node: any, path = "stage", depth = 0) {
        if (!node) return;

        const bounds = getBoundsSafe(node);
        const text = collectText(node).trim();
        const lower = text.toLowerCase();

        if (bounds && isVisible(node) && text.length > 0 && lower.includes(query)) {
          results.push({
            path,
            text,
            name: node.name ?? null,
            depth,
            bounds,
          });
        }

        node.children?.forEach((child: any, i: number) => {
          walk(child, `${path}.children[${i}]`, depth + 1);
        });
      }

      walk(stage);

      console.table(results);
      return results;
    };  
    (window as any).__pixiDumpVisibleUi = () => {
  const stage = getStage();
  if (!stage) {
    console.warn("No Pixi stage found");
    return [];
  }

  const results: any[] = [];

    function walk(node: any, path = "stage", depth = 0) {
        if (!node) return;

        const bounds = getBoundsSafe(node);

        if (bounds && isVisible(node) && isUI(node)) {
          results.push({
            path,
            name: node.name ?? null,
            text: collectText(node),
            interactive: node.interactive,
            eventMode: node.eventMode,
            _internalInteractive: node._internalInteractive ?? null,
            _internalEventMode: node._internalEventMode ?? null,
            depth,
            bounds,
          });
        }

        node.children?.forEach((child: any, i: number) => {
          walk(child, `${path}.children[${i}]`, depth + 1);
        });
      }

      walk(stage);

      console.table(results);
      return results;
    };
    
    (window as any).__pixiRecordAlt = (name: string, screen = "unknown") => {
      if (!lastSecondaryObject || !lastSecondaryPath) {
        console.warn("No SECONDARY hovered object");
        return;
      }

      const bounds = getBoundsSafe(lastSecondaryObject);

      const record = {
        name,
        screen,
        path: lastSecondaryPath,
        text: collectText(lastSecondaryObject),
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

      console.log("✅ Recorded SECONDARY:", record);
      console.table(records);

      return record;
    };

    (window as any).__pixiExport = () => {
      console.log(JSON.stringify(records, null, 2));
      return records;
    };

    (window as any).__pixiClick = () => {
      if (!lastPrimaryObject) return;

      lastPrimaryObject.emit?.("pointertap");
      lastPrimaryObject.emit?.("click");

      console.log("✅ Click emitted on PRIMARY");
    };

    (window as any).__pixiClickAlt = () => {
      if (!lastSecondaryObject) return;

      lastSecondaryObject.emit?.("pointertap");
      lastSecondaryObject.emit?.("click");

      console.log("✅ Click emitted on SECONDARY");
    };

    (window as any).__copyPath = () => {
      navigator.clipboard.writeText(lastPrimaryPath || "");
      console.log("📋 Copied PRIMARY path:", lastPrimaryPath);
    };

    (window as any).__copyAltPath = () => {
      navigator.clipboard.writeText(lastSecondaryPath || "");
      console.log("📋 Copied SECONDARY path:", lastSecondaryPath);
    };

    console.log("✅ Vendor Pixi Recorder Ready");
    console.log("Primary highlight = RED");
    console.log("Secondary highlight = CYAN");
    console.log('Use __pixiRecord("name","screen") for PRIMARY');
    console.log('Use __pixiRecordAlt("name","screen") for SECONDARY');
  });
}
``