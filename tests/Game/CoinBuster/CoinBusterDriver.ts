import { Frame, Page,expect } from "@playwright/test";
import * as pixi from "../../helpers/pixiHelpers";
import { CoinBusterObjects } from "./CoinbusterPOM";
import path from "path";
import * as fs from "fs";

type GoType = "MAIN" | "BONUS_CONTINUE";
type BonusType = "WHEEL" | "PICK" | "MATCH3" | "SAFE" | "NONE";

export class CoinBusterDriver {
  constructor(
    private page: Page,
    private frame: Frame
  ) {}

  async ensureReady() {
    await pixi.ensurePixiHelpers(this.frame);
  }

  /**
   * Used for clickable Pixi objects.
   * Waits until the object is actually enabled/interactable,
   * not just visible.
   */

  // ✅ Click helper
  private async click(path: string) {
    await pixi.waitForPixiObjectReadyToClick(this.frame, path);
    await pixi.clickPixiObjectByPath(this.page, this.frame, path);
  }
  

  /**
   * Used for passive screen assertions.
   * This only checks visibility/readiness, not clickability.
   */
  private async waitFor(path: string) {
    await pixi.waitPixiObjectOnScreen(this.frame, path);
  }
  
  private isActiveGo(state: any) {
    return Boolean(
      state &&
        state.exists &&
        state.worldAlpha > 0 &&
        state.interactive === true &&
        state.eventMode === "static"
    );
  }

  private isVisibleContent(state: any) {
    return Boolean(
      state &&
        state.exists &&
        state.worldAlpha > 0 &&
        state.width > 0 &&
        state.height > 0
    );
  }


async isLoadingVisible(): Promise<boolean> {
  return await this.frame.evaluate(() => {
    const stage =
      (window as any).__PIXI_STAGE__ ||
      (window as any).pixi_app?.stage ||
      (window as any).app?.stage;

    if (!stage) return false;

    let hit: any = null;

    function scan(node: any) {
      if (!node || hit) return;

      if (node.name === "back" && node.template?.image === "loaderWheelGlow.psd") {
        hit = node;
        return;
      }

      node.children?.forEach(scan);
    }

    scan(stage);

    if (!hit) return false;

    // ✅ "Actually on screen" = worldVisible + worldAlpha + renderable
    const worldVisible = hit.worldVisible ?? false;
    const worldAlpha = hit.worldAlpha ?? 0;
    const renderable = hit.renderable ?? true;

    return Boolean(worldVisible && renderable && worldAlpha > 0.01);
  });
}
  
async waitForLoadingToAppear(timeout = 5000) {
  await this.frame.waitForFunction(() => {
    const stage =
      (window as any).__PIXI_STAGE__ ||
      (window as any).pixi_app?.stage ||
      (window as any).app?.stage;

    if (!stage) return false;

    let hit: any = null;

    function scan(node: any) {
      if (!node || hit) return;
      if (node.name === "back" && node.template?.image === "loaderWheelGlow.psd") {
        hit = node;
        return;
      }
      node.children?.forEach(scan);
    }

    scan(stage);
    if (!hit) return false;

    const worldVisible = hit.worldVisible ?? false;
    const worldAlpha = hit.worldAlpha ?? 0;
    const renderable = hit.renderable ?? true;

    return Boolean(worldVisible && renderable && worldAlpha > 0.01);
  }, null, { timeout, polling: "raf" });
}


async waitForLoadingToDisappear(timeout = 15000) {
  await this.frame.waitForFunction(() => {
    const stage =
      (window as any).__PIXI_STAGE__ ||
      (window as any).pixi_app?.stage ||
      (window as any).app?.stage;

    // If stage is gone, loader can't be visible
    if (!stage) return true;

    let hit: any = null;

    function scan(node: any) {
      if (!node || hit) return;
      if (node.name === "back" && node.template?.image === "loaderWheelGlow.psd") {
        hit = node;
        return;
      }
      node.children?.forEach(scan);
    }

    scan(stage);

    // If loader node not found, consider it "disappeared"
    if (!hit) return true;

    const worldVisible = hit.worldVisible ?? false;
    const worldAlpha = hit.worldAlpha ?? 0;
    const renderable = hit.renderable ?? true;

    const visibleNow = Boolean(worldVisible && renderable && worldAlpha > 0.01);
    return !visibleNow;
  }, null, { timeout, polling: "raf" });
}


  // Assertions / waits


  async expectHomeScreenVisible() {
    const path = CoinBusterObjects.HomeScreen.tryOrPlayButton.path;

    await this.expectScreen(
      "HOME",
      async () => {
        const s = await pixi.getPixiObjectState(this.frame, path).catch(() => null);
        return this.isClickable(s);
      },
      [path]
    );
  } 



  async expectTicketCostScreenVisible() {
    const path = CoinBusterObjects.ticketCostScreen.tryOrPlayButton.path;

    await this.expectScreen(
      "TICKET COST",
      async () => {
        const s = await pixi.getPixiObjectState(this.frame, path).catch(() => null);
        return this.isClickable(s);
      },
      [path]
    );
  }



  async expectGamePlayScreenVisible() {
    const path = CoinBusterObjects.progressGo.main.path;

    await this.expectScreen(
      "GAMEPLAY",
      async () => {
        const s = await pixi.getPixiObjectState(this.frame, path).catch(() => null);
        return this.isClickable(s);
      },
      [path]
    );
  }



  async expectBonusWheelScreenVisible() {
    const path = CoinBusterObjects.bonusWheelScreen.goButton.path;

    await this.expectScreen(
      "BONUS WHEEL",
      async () => {
        const s = await pixi.getPixiObjectState(this.frame, path).catch(() => null);
        return this.isClickable(s);
      },
      [path]
    );
  }



  async expectBonusSafeScreenVisible() {
    const path = CoinBusterObjects.bonusSafeScreen.safe.path;

    await this.expectScreen(
      "BONUS SAFE",
      async () => {
        const s = await pixi.getPixiObjectState(this.frame, path).catch(() => null);
        return this.isClickable(s);
      },
      [path]
    );
  }
  
  async expectResultscreenVisible() {
    const tryAgain = CoinBusterObjects.resultScreen.tryOrPlayAgain.path;
    const changeCost = CoinBusterObjects.resultScreen.changeCost.path;

    await this.expectScreen(
      "RESULT",
      async () => await this.isResultVisible(),
      [tryAgain, changeCost]
    );
  }



  // Actions

  async startDemoGame() {
    await this.click(CoinBusterObjects.HomeScreen.tryOrPlayButton.path);
  }

  async clickPriceTryOrPlay() {
    await this.click(CoinBusterObjects.ticketCostScreen.tryOrPlayButton.path);
  }

  async pressGo() {
    await this.click(CoinBusterObjects.progressGo.main.path);
  }


  // Bonus actionsor simplicity, we press safe 6 times as a "testing behavior" to get through the safe bonus, since it can be tapped multiple times before disappearing. We can refine this later with better state detection if needed.

  async clickSafe() {
  await this.tapUntilNotClickable(
    "🔐 SAFE",
    CoinBusterObjects.bonusSafeScreen.safe.path,
    12,   // safety cap (tune if needed)
    250
  );
}


  async clickWheelBonusGo() {
    await this.click(CoinBusterObjects.bonusWheelScreen.goButton.path);
  }

  async clickMatch3Cell(index: number) {
    if (index < 0 || index > 11) {
      throw new Error(`Invalid Match3 cell index: ${index}. Expected 0-11.`);
    }

    const base = "stage.children[0].children[0].children[13].children[3]";
    const path = `${base}.children[${index}].children[9]`;

    await this.click(path);
  }
  

/**
 */

async clickPiggy0() {
  await this.tapUntilNotClickable(
    "🐷 PICK piggy0",
    CoinBusterObjects.bonusPickScreen.piggyBank0.path,
    12,
    250
  );
}


  async clickBonusWheelSegment(){
    await this.click(CoinBusterObjects.bonusWheelScreen.goButton.path);
  }


  // ----------------------------
  // Result detection
  // ----------------------------

async isResultVisible(): Promise<boolean> {
  const [tryAgain, changeCost] = await Promise.all([
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.resultScreen.tryOrPlayAgain.path).catch(() => null),
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.resultScreen.changeCost.path).catch(() => null),
  ]);

  // Primary: treat result buttons like GO buttons
  const clickable =
    this.isClickableButton(tryAgain) || this.isClickableButton(changeCost);

  // Fallback: sometimes result buttons are visible but not yet interactive for a moment
  const visibleEnough =
    Boolean(tryAgain && tryAgain.worldAlpha > 0) ||
    Boolean(changeCost && changeCost.worldAlpha > 0);

  return clickable || visibleEnough;
}



 
  // ----------------------------
  // Progress GO (Main vs BonusContinue)
  // ----------------------------

  /**
   * Clicks whichever GO is currently active:
   * - MAIN go when in gameplay
   * - BONUS_CONTINUE go when bonus trigger/transition is active
   */

async clickProgressGo(): Promise<GoType> {
  const candidates: Array<{ type: GoType; path: string }> = [
    { type: "BONUS_CONTINUE", path: CoinBusterObjects.progressGo.bonusContinue.path },
    { type: "MAIN", path: CoinBusterObjects.progressGo.main.path },
  ];

  // Retry window to survive the "momentarily unclickable" transition
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    for (const c of candidates) {
      const s = await pixi.getPixiObjectState(this.frame, c.path).catch(() => null);

      if (this.isActiveGo(s)) {
        console.log(`✅ Clicking progress GO → ${c.type}`);
        await this.click(c.path);
        return c.type;
      }
    }

    // Neither GO active yet → wait briefly and try again
    await this.page.waitForTimeout(150);
  }

  throw new Error("❌ No active progress GO found (main or bonusContinue) within 10s.");
}


  // ----------------------------
  // Bonus detection & handling
  // ----------------------------

  /** Checks which bonus content is currently visible (no waiting). */

async detectBonusTypeOnce(): Promise<BonusType> {
  const [wheel, piggy, match3, safe] = await Promise.all([
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.bonusWheelScreen.goButton.path).catch(() => null),
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.bonusPickScreen.piggyBank0.path).catch(() => null),
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.match3Screen.getCellPath(0)).catch(() => null),
    pixi.getPixiObjectState(this.frame, CoinBusterObjects.bonusSafeScreen.safe.path).catch(() => null),
  ]);

  // ✅ All treated as buttons now
  if (this.isActiveGo(wheel)) return "WHEEL";
  if (this.isActiveGo(piggy)) return "PICK";
  if (this.isActiveGo(match3)) return "MATCH3";

  // SAFE: only if it behaves like a button too
  if (this.isActiveGo(safe)) return "SAFE";

  return "NONE";

  }

  /**
   * Waits until ANY bonus content appears (wheel/piggy/match3/safe),
   * because you confirmed bonus content loads over time.
   */
  async waitForBonusContent(timeout = 8000): Promise<BonusType> {
    await expect
      .poll(
        async () => {
          return await this.detectBonusTypeOnce();
        },
        {
          timeout,
          message: "Waiting for bonus content to appear (wheel/pick/match3/safe)",
        }
      )
      .not.toBe("NONE");

    return await this.detectBonusTypeOnce();
  }


  /** Handles one bonus step after entering bonus flow. */
  async handleBonusOnce() {
    const type = await this.waitForBonusContent(8000);
    console.log("🎁 Bonus detected:", type);

    switch (type) {
      case "WHEEL":
        await this.clickWheelBonusGo();
        await this.waitForNextState();
        return;

      case "PICK":
        await this.clickPiggy0();
        await this.waitForNextState();
        return;

      case "MATCH3":
        await this.solveMatch3BySequentialClicks(12);
        await this.waitForNextState();
        return;

      case "SAFE":
        await this.clickSafe();
        await this.waitForNextState();
        return;

      default:
        // fallback: sometimes it's just a transition screen, progress with GO
        await this.clickProgressGo();
        return;
    }
  }

  // ----------------------------
  // Main game loop (button-driven)
  // ----------------------------

  /**
   * Button-driven loop:
   * - click progress GO repeatedly
   * - if we clicked BONUS_CONTINUE, wait for bonus content and handle it
   * - stop when result appears
   */
  
async playButtonDriven() {
  let safety = 80;

  while (safety-- > 0) {
    console.log("LOOP TICK:", safety);

    if (await this.isResultVisible()) {
      console.log("✅ Result reached. Stopping.");
      return;
    }


      const goType = await this.clickProgressGo();
      console.log("GO TYPE:", goType);

      // wait for transition (GO / RESULT / BONUS)
      await this.waitForNextState();

      if (await this.isResultVisible()) {
        console.log("✅ Result reached. Stopping.");
        return;
      }

      // ✅ CRITICAL: handle bonus AFTER BONUS_CONTINUE
     if (goType === "BONUS_CONTINUE") {
        console.log("🟡 BonusContinue clicked → handling bonus...");
        await this.handleBonusOnce();
}
  }}


//non debug version of waitForAnyProgressGo, which just throws if neither GO is active after timeout, without the extra logging. We can switch to this once we're confident in the flow and want cleaner test output.
// private async waitForAnyProgressGo(timeout = 8000) {
//   await expect.poll(async () => {
//     const [bonusContinue, main] = await Promise.all([
//       pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.bonusContinue.path).catch(() => null),
//       pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.main.path).catch(() => null),
//     ]);

//     return this.isActiveGo(bonusContinue) || this.isActiveGo(main);
//   }, {
//     timeout,
//     message: "Waiting for a progress GO (main or bonusContinue) to become active after wheel",
//   }).toBe(true);
// }



private async waitForNextState(timeout = 15000) {
  try {
    await expect.poll(async () => {
      // ✅ result check
      if (await this.isResultVisible()) return "RESULT";

      // ✅ progress GO
      const [bonusContinue, main] = await Promise.all([
        pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.bonusContinue.path).catch(() => null),
        pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.main.path).catch(() => null),
      ]);

      if (this.isActiveGo(bonusContinue) || this.isActiveGo(main)) {
        return "GO";
      }

      // ✅ bonus content
      const bonus = await this.detectBonusTypeOnce();
      if (bonus !== "NONE") return "BONUS";

      return "NONE";
    }, {
      timeout,
      message: "Waiting for next state (GO / RESULT / BONUS)",
    }).not.toBe("NONE");
  } catch (e) {
    // 📸 screenshot on failure
    await this.captureFailureArtifacts("waitForNextState");

    throw e; // rethrow so the test still fails
  }
}



/**
 * MATCH3 (TEST MODE, SIMPLE STRATEGY)
 * ----------------------------------
 * We do not try to detect symbols or matches (randomised and vendor-specific).
 * Instead we click tiles sequentially (1 → 12).
 *
 * Exit rule (important):
 * - As soon as the "next" tile is NOT clickable within a short window,
 *   we assume Match3 has resolved (match found / board disabled / transition),
 *   and we stop clicking tiles.
 * - Then we wait for progress GO (main or bonusContinue) to become active again.
 *
 * Why this exists:
 * - Match3 tiles can remain visible but flip to eventMode="auto" / interactive=false
 *   once a match is reached. Waiting 10s per tile (normal click()) causes timeouts.
 */
async solveMatch3BySequentialClicks(
  maxTiles = 12,
  perTileTimeoutMs = 800
) {
  console.log("🧩 MATCH3(TEST): sequential clicks until tiles stop being clickable");

  for (let i = 0; i < maxTiles; i++) {
    const tileNumber = i + 1;
    const cellPath = CoinBusterObjects.match3Screen.getCellPath(i);

    // If progress GO is already back, match3 is resolved; exit immediately.
    const [bonusContinue, mainGo] = await Promise.all([
      pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.bonusContinue.path).catch(() => null),
      pixi.getPixiObjectState(this.frame, CoinBusterObjects.progressGo.main.path).catch(() => null),
    ]);

    if (this.isActiveGo(bonusContinue) || this.isActiveGo(mainGo)) {
      console.log(`🧩 MATCH3(TEST): progress GO active before tile ${tileNumber}, exiting`);
      return;
    }

    // Short "try-wait" for this tile to be clickable (avoid 10s stall on dead tiles).
    const deadline = Date.now() + perTileTimeoutMs;
    let clickable = false;

    while (Date.now() < deadline) {
      const s = await pixi.getPixiObjectState(this.frame, cellPath).catch(() => null);

      // Match3 tiles behave like buttons (clickLayers) → use active button signature
      if (this.isActiveGo(s)) {
        clickable = true;
        break;
      }

      await this.page.waitForTimeout(100);
    }

    // If the next tile isn't clickable quickly, stop match3.
    if (!clickable) {
      console.log(`🧩 MATCH3(TEST): tile ${tileNumber} not clickable → assume resolved, stop clicking`);
      await this.waitForNextState(15000);
      return;
    }

    console.log(`🧩 MATCH3(TEST): click tile ${tileNumber}`);
    await pixi.clickPixiObjectByPath(this.page, this.frame, cellPath);

    // Tiny settle for animations/state updates
    await this.page.waitForTimeout(200);
  }

  // If we managed to click all tiles, wait for progress GO to return.
  console.log("🧩 MATCH3(TEST): clicked all tiles → waiting for progress GO");
  await this.waitForNextState(15000);
}



private isClickable(state: any) {
  return Boolean(
    state &&
      state.exists &&
      state.worldAlpha > 0 &&
      state.interactive === true &&
      state.eventMode === "static"
  );
}


/**
 * TEST-FRIENDLY: Tap a Pixi "button" repeatedly until it becomes NOT clickable.
 * - Stops as soon as !clickable (interactive false / eventMode auto / worldAlpha 0 etc.)
 * - Includes a maxTaps safety cap to prevent infinite loops
 */
private async tapUntilNotClickable(
  label: string,
  path: string,
  maxTaps = 12,
  settleMs = 250
) {
  for (let i = 1; i <= maxTaps; i++) {
    const state = await pixi.getPixiObjectState(this.frame, path).catch(() => null);

    // ✅ stop condition: not clickable anymore
    if (!this.isClickable(state)) {
      console.log(`${label}: became NOT clickable → stop (after ${i - 1} taps)`);
      return;
    }

    console.log(`${label}: tap ${i}/${maxTaps}`);
    await pixi.clickPixiObjectByPath(this.page, this.frame, path);

    // give time for animations / state switch
    await this.page.waitForTimeout(settleMs);
  }

  console.log(`${label}: reached maxTaps=${maxTaps} → stop`);
}

private isClickableButton(state: any) {
  return Boolean(
    state &&
      state.exists &&
      state.worldAlpha > 0 &&
      state.interactive === true &&
      state.eventMode === "static"
  );
}
// assertion helper with enhanced logging for progress GO / result detection, which can be flaky due to timing and state transitions. This will help us debug and stabilize the flow before switching to a cleaner version without the extra logs.
private async expectScreen(
  name: string,
  checkFn: () => Promise<boolean>,
  debugPaths: string[],
  timeout = 10000,
  opts?: { screenshotOnFail?: boolean; screenshotDir?: string }
) {
  try {
    await expect
      .poll(checkFn, {
        timeout,
        message: `Waiting for ${name} screen`,
      })
      .toBe(true);
  } catch (e) {
    console.error(`❌ ${name} screen NOT detected`);

    // ✅ Screenshot on failure (only)
    const screenshotOnFail = opts?.screenshotOnFail ?? true;
    if (screenshotOnFail) {
      const dir = opts?.screenshotDir ?? path.join(process.cwd(), "test-artifacts");
      fs.mkdirSync(dir, { recursive: true });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `${name}-${stamp}`;

      try {
        await this.page.screenshot({
          path: path.join(dir, `${base}-full.png`),
          fullPage: true,
        });

        // canvas inside the game frame
        await this.frame.locator("canvas").screenshot({
          path: path.join(dir, `${base}-canvas.png`),
        });

        console.error(`📸 Saved screenshots to: ${dir}`);
      } catch (shotErr) {
        console.error("⚠️ Failed to capture screenshots:", shotErr);
      }
    }

    // dump useful debug info (your existing part)
    const states = await Promise.all(
      debugPaths.map((p) => pixi.getPixiObjectState(this.frame, p).catch(() => null))
    );

    debugPaths.forEach((p, i) => {
      const s = states[i];
      console.error(
        `STATE → ${p}:`,
        s
          ? {
              exists: s.exists,
              worldAlpha: s.worldAlpha,
              interactive: s.interactive,
              eventMode: s.eventMode,
              cursor: s.cursor,
            }
          : "null"
      );
    });

    // keep your failure message (optionally include original cause)
    throw new Error(`❌ Expected ${name} screen but it did not appear`, { cause: e as any });
  }
}


private async captureFailureArtifacts(tag: string) {
  const dir = path.join(process.cwd(), "test-artifacts");
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${tag}-${stamp}`;

  try {
    await this.page.screenshot({
      path: path.join(dir, `${base}-full.png`),
      fullPage: true,
    });

    await this.frame.locator("canvas").screenshot({
      path: path.join(dir, `${base}-canvas.png`),
    });

    console.error(`📸 Saved failure screenshots: ${path.join(dir, base)}-*`);
  } catch (err) {
    console.error("⚠️ Failed to capture screenshots:", err);
  }
}

}

