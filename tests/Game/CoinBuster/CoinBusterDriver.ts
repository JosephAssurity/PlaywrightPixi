import { expect } from "@playwright/test";
import * as pixi from "../../helpers/pixiHelpers";
import { CoinBusterObjects } from "./CoinbusterPOM";
import { BaseIwgDriver } from "../../Base/BaseIwgDriver";

type GoType = "MAIN" | "BONUS_CONTINUE";
type BonusType = "WHEEL" | "PICK" | "MATCH3" | "SAFE" | "NONE";

export class CoinBusterDriver extends BaseIwgDriver {

  // ----------------------------
  // Assertions
  // ----------------------------

  async expectHomeScreenVisible() {
    const p = CoinBusterObjects.HomeScreen.tryOrPlayButton.path;
    await this.expectScreen(
      "HOME",
      async () => this.isClickable(await this.getState(p)),
      [p]
    );
  }

  async expectTicketCostScreenVisible() {
    const p = CoinBusterObjects.ticketCostScreen.tryOrPlayButton.path;
    await this.expectScreen(
      "TICKET COST",
      async () => this.isClickable(await this.getState(p)),
      [p]
    );
  }

  async expectGamePlayScreenVisible() {
    const p = CoinBusterObjects.progressGo.main.path;
    await this.expectScreen(
      "GAMEPLAY",
      async () => this.isClickable(await this.getState(p)),
      [p]
    );
  }

  async expectBonusWheelScreenVisible() {
    const p = CoinBusterObjects.bonusWheelScreen.goButton.path;
    await this.expectScreen(
      "BONUS WHEEL",
      async () => this.isClickable(await this.getState(p)),
      [p]
    );
  }

  async expectBonusSafeScreenVisible() {
    const p = CoinBusterObjects.bonusSafeScreen.safe.path;
    await this.expectScreen(
      "BONUS SAFE",
      async () => this.isClickable(await this.getState(p)),
      [p]
    );
  }

  async expectResultScreenVisible() {
    const tryAgain = CoinBusterObjects.resultScreen.tryOrPlayAgain.path;
    const changeCost = CoinBusterObjects.resultScreen.changeCost.path;

    await this.expectScreen(
      "RESULT",
      async () => await this.isResultVisible(),
      [tryAgain, changeCost]
    );
  }

  // ----------------------------
  // Basic actions
  // ----------------------------

  async startDemoGame() {
    await this.click(CoinBusterObjects.HomeScreen.tryOrPlayButton.path);
  }

  async clickPriceTryOrPlay() {
    await this.click(CoinBusterObjects.ticketCostScreen.tryOrPlayButton.path);
  }

  async pressGo() {
    await this.click(CoinBusterObjects.progressGo.main.path);
  }

  // ----------------------------
  // Bonus actions
  // ----------------------------

  async clickSafe() {
    await this.tapUntilNotClickable(
      "🔐 SAFE",
      CoinBusterObjects.bonusSafeScreen.safe.path,
      12,
      250
    );
  }

  async clickWheelBonusGo() {
    await this.click(CoinBusterObjects.bonusWheelScreen.goButton.path);
  }

  async clickPiggy0() {
    await this.tapUntilNotClickable(
      "🐷 PICK piggy0",
      CoinBusterObjects.bonusPickScreen.piggyBank0.path,
      12,
      250
    );
  }

  async clickMatch3Cell(index: number) {
    if (index < 0 || index > 11) {
      throw new Error(`Invalid Match3 cell index: ${index}. Expected 0-11.`);
    }

    const p = CoinBusterObjects.match3Screen.getCellPath(index);
    await this.click(p);
  }

  // ----------------------------
  // Result detection
  // ----------------------------

  async isResultVisible(): Promise<boolean> {
    const [tryAgain, changeCost] = await Promise.all([
      this.getState(CoinBusterObjects.resultScreen.tryOrPlayAgain.path),
      this.getState(CoinBusterObjects.resultScreen.changeCost.path),
    ]);

    const clickable =
      this.isClickable(tryAgain) || this.isClickable(changeCost);

    const visibleEnough =
      Boolean(tryAgain && tryAgain.worldAlpha > 0) ||
      Boolean(changeCost && changeCost.worldAlpha > 0);

    return clickable || visibleEnough;
  }

  // ----------------------------
  // Progress GO selection
  // ----------------------------

  async clickProgressGo(): Promise<GoType> {
    const candidates: Array<{ type: GoType; path: string }> = [
      { type: "BONUS_CONTINUE", path: CoinBusterObjects.progressGo.bonusContinue.path },
      { type: "MAIN", path: CoinBusterObjects.progressGo.main.path },
    ];

    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
      for (const c of candidates) {
        const s = await this.getState(c.path);

        if (this.isActiveGo(s)) {
          console.log(`✅ Clicking progress GO → ${c.type}`);
          await this.click(c.path);
          return c.type;
        }
      }

      await this.page.waitForTimeout(150);
    }

    throw new Error("❌ No active progress GO found (main or bonusContinue) within 10s.");
  }

  // ----------------------------
  // Bonus detection
  // ----------------------------

  async detectBonusTypeOnce(): Promise<BonusType> {
    const [wheel, piggy, match3, safe] = await Promise.all([
      this.getState(CoinBusterObjects.bonusWheelScreen.goButton.path),
      this.getState(CoinBusterObjects.bonusPickScreen.piggyBank0.path),
      this.getState(CoinBusterObjects.match3Screen.getCellPath(0)),
      this.getState(CoinBusterObjects.bonusSafeScreen.safe.path),
    ]);

    if (this.isActiveGo(wheel)) return "WHEEL";
    if (this.isActiveGo(piggy)) return "PICK";
    if (this.isActiveGo(match3)) return "MATCH3";
    if (this.isActiveGo(safe)) return "SAFE";

    return "NONE";
  }

  async waitForBonusContent(timeout = 8000): Promise<BonusType> {
    await expect
      .poll(
        async () => await this.detectBonusTypeOnce(),
        {
          timeout,
          message: "Waiting for bonus content to appear (wheel/pick/match3/safe)",
        }
      )
      .not.toBe("NONE");

    return await this.detectBonusTypeOnce();
  }

  // ----------------------------
  // Next-state wait
  // ----------------------------

  async waitForNextState(timeout = 15000) {
    try {
      await expect
        .poll(
          async () => {
            if (await this.isResultVisible()) return "RESULT";

            const [bonusContinue, main] = await Promise.all([
              this.getState(CoinBusterObjects.progressGo.bonusContinue.path),
              this.getState(CoinBusterObjects.progressGo.main.path),
            ]);

            if (this.isActiveGo(bonusContinue) || this.isActiveGo(main)) {
              return "GO";
            }

            const bonus = await this.detectBonusTypeOnce();
            if (bonus !== "NONE") return "BONUS";

            return "NONE";
          },
          {
            timeout,
            message: "Waiting for next state (GO / RESULT / BONUS)",
          }
        )
        .not.toBe("NONE");
    } catch (e) {
      await this.captureFailureArtifacts("waitForNextState");
      throw e;
    }
  }

  // ----------------------------
  // MATCH3 handling
  // ----------------------------

  /**
   * MATCH3 (TEST MODE, SIMPLE STRATEGY)
   * ----------------------------------
   * We do not try to detect symbols or matches.
   * We click tiles sequentially (1 → 12).
   *
   * Exit rule:
   * - As soon as the next tile is NOT clickable within a short window,
   *   we assume Match3 has resolved (board disabled / transition),
   *   and stop clicking.
   * - Then wait for next game state (GO / BONUS / RESULT).
   */
  async solveMatch3BySequentialClicks(
    maxTiles = 12,
    perTileTimeoutMs = 800
  ) {
    console.log("🧩 MATCH3(TEST): sequential clicks until tiles stop being clickable");

    for (let i = 0; i < maxTiles; i++) {
      const tileNumber = i + 1;
      const cellPath = CoinBusterObjects.match3Screen.getCellPath(i);

      const [bonusContinue, mainGo] = await Promise.all([
        this.getState(CoinBusterObjects.progressGo.bonusContinue.path),
        this.getState(CoinBusterObjects.progressGo.main.path),
      ]);

      if (this.isActiveGo(bonusContinue) || this.isActiveGo(mainGo)) {
        console.log(`🧩 MATCH3(TEST): progress GO active before tile ${tileNumber}, exiting`);
        return;
      }

      const deadline = Date.now() + perTileTimeoutMs;
      let clickable = false;

      while (Date.now() < deadline) {
        const s = await this.getState(cellPath);

        if (this.isActiveGo(s)) {
          clickable = true;
          break;
        }

        await this.page.waitForTimeout(100);
      }

      if (!clickable) {
        console.log(`🧩 MATCH3(TEST): tile ${tileNumber} not clickable → assume resolved, stop clicking`);
        await this.waitForNextState(15000);
        return;
      }

      console.log(`🧩 MATCH3(TEST): click tile ${tileNumber}`);
      await pixi.clickPixiObjectByPath(this.page, this.frame, cellPath);

      await this.page.waitForTimeout(200);
    }

    console.log("🧩 MATCH3(TEST): clicked all tiles → waiting for next state");
    await this.waitForNextState(15000);
  }

  // ----------------------------
  // Bonus dispatcher
  // ----------------------------

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
        await this.clickProgressGo();
        return;
    }
  }

  // ----------------------------
  // Main loop
  // ----------------------------

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

      await this.waitForNextState();

      if (await this.isResultVisible()) {
        console.log("✅ Result reached. Stopping.");
        return;
      }

      if (goType === "BONUS_CONTINUE") {
        console.log("🟡 BonusContinue clicked → handling bonus...");
        await this.handleBonusOnce();
      }
    }

    throw new Error("❌ Loop timeout (safety limit hit).");
  }
}