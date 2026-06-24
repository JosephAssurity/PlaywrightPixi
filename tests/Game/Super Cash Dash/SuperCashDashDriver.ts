import { expect } from "@playwright/test";
import * as pixi from "../../helpers/pixiHelpers";
import { SuperCashDashObjects } from "./SuperCashDashPOM"
import { BaseSgDriver } from "../../Base/BaseSgDriver";

export class SuperCashDashDriver extends BaseSgDriver {
  // ----------------------------
  // Screen assertions
  // ----------------------------
 
  async expectHomeScreenVisible() {
    const path = SuperCashDashObjects.homeScreen.tryButton.path;

    await this.expectScreen(
      "HOME",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectHowToPlayScreenVisible() {
    const path = SuperCashDashObjects.howToPlayScreen.continueButton.path;

    await this.expectScreen(
      "HOW TO PLAY",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectRankingScreenVisible() {
    const path = SuperCashDashObjects.rankingScreen.randomSelectButton.path;

    await this.expectScreen(
      "RANKING",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }
  async expectConfirmSelectionButtonVisible() {
    const path = SuperCashDashObjects.rankingScreen.confirmSelectionButton.path;

    await this.expectScreen(
      "RANKING",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }
  async expectGamePlayScreenVisible() {
    const path = SuperCashDashObjects.gamePlayScreen.playButton.path;

    await this.expectScreen(
      "GAMEPLAY",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectResultScreenVisible(timeout = 120000) {
    const tryAgain = SuperCashDashObjects.resultScreen.tryAgainButton.path;
    const homeButton = SuperCashDashObjects.resultScreen.homeButton.path;

    await this.expectScreen(
      "RESULT",
      async () => {
        const [tryAgainState, homeState] = await Promise.all([
          this.getState(tryAgain),
          this.getState(homeButton)
   
        ]);

        return this.isClickable(tryAgainState) || this.isClickable(homeState);
      },
      [tryAgain, homeButton],
      timeout
    );
  }
  async expectTicketCostValue(expected: number) {
  await expect
    .poll(async () => {
      return await this.getTicketCostValue();
    }, {
      timeout: 5000,
      message: `Waiting for ticket cost to be ${expected}`,
    })
    .toBe(expected);
}
  async expectHamburgerMenuVisible() {
    const path = SuperCashDashObjects.hamburgerBar.soundButton.path;

    await this.expectScreen(
      "hambburger menu",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

async expectInformationPanelVisible() {
  const panel = this.frame.locator(".sgs-infopanel-markdown");

  await expect(panel).toBeVisible();

  await expect(panel).toContainText("Main Game Rules");
  await expect(panel).toContainText("Rank your pieces from first place to last place before the race begins.");
  await expect(panel).toContainText("Press PLAY to randomly choose which piece moves and which direction it moves.");
  await expect(panel).toContainText("Box Bonus Game");
  await expect(panel).toContainText("Balloon Bonus Game");
  await expect(panel).toContainText("Copyright © SG Studios");
  await expect(panel).toContainText("0.0.6");
}

//Sequence for SuperCashDash ticket cost is 1 → 2 → 5 → 10, so we can use this helper to step through and verify each increase.
private readonly ticketCostSequence = [1, 2, 5, 10];

async increaseTicketCostAndExpectNext() {
  const current = await this.getTicketCostValue();

  const index = this.ticketCostSequence.indexOf(current);

  if (index === -1) {
    throw new Error(`❌ Current ticket cost ${current} is not in the known sequence`);
  }

  if (index === this.ticketCostSequence.length - 1) {
    throw new Error(`❌ Ticket cost ${current} is already at max`);
  }

  const expectedNext = this.ticketCostSequence[index + 1];

  console.log(`🎟 Ticket cost: ${current} -> ${expectedNext}`);

  await this.click(
    SuperCashDashObjects.homeScreen.increaseCostButton.path,
  );

  await this.expectTicketCostValue(expectedNext);
}
async decreaseTicketCostAndExpectPrevious() {
  const current = await this.getTicketCostValue();

  const index = this.ticketCostSequence.indexOf(current);

  if (index === -1) {
    throw new Error(`❌ Current ticket cost ${current} is not in the known sequence`);
  }

  // ✅ For decrease, block only if already at MIN
  if (index === 0) {
    throw new Error(`❌ Ticket cost ${current} is already at min`);
  }

  const expectedPrevious = this.ticketCostSequence[index - 1];

  console.log(`🎟 Ticket cost: ${current} -> ${expectedPrevious}`);

  await this.click(
    SuperCashDashObjects.homeScreen.decreaseCostButton.path,
  );

  await this.expectTicketCostValue(expectedPrevious);
}

  // ----------------------------
  // Basic actions
  // ----------------------------

  async startDemoGame() {
    await this.click(SuperCashDashObjects.homeScreen.tryButton.path);
  }

  async openHamburgerMenu() {
    await this.click(SuperCashDashObjects.homeScreen.hamburgerButton.path);
  }
  async toggleSound() {
    await this.openHamburgerMenu();
    await this.expectHamburgerMenuVisible();
    await this.click(SuperCashDashObjects.hamburgerBar.soundButton.path);
    await this.click(SuperCashDashObjects.hamburgerBar.closeButton.path); // close hamburger menu after toggling sound
   }
  

  async continueHowToPlay() {
    await this.click(SuperCashDashObjects.howToPlayScreen.continueButton.path);
  }

  async nextHowToPlay() {
    await this.click(SuperCashDashObjects.howToPlayScreen.nextButton.path);
  }

  async randomSelect() {
    await this.click(SuperCashDashObjects.rankingScreen.randomSelectButton.path);
  }

  async clearSelection() {
    await this.click(SuperCashDashObjects.rankingScreen.clearSelectionButton.path);
  }

  async confirmSelection() {
    await this.click(SuperCashDashObjects.rankingScreen.confirmSelectionButton.path);
  }

  async pressPlay() {
    await this.click(SuperCashDashObjects.gamePlayScreen.playButton.path);
  }

  async pressAutoPlay() {
    await this.click(SuperCashDashObjects.gamePlayScreen.autoPlayButton.path);
  }

  async stopAutoPlay() {
    await this.click(SuperCashDashObjects.gamePlayScreen.stopAutoPlayButton.path);
  }

  async clickTryAgain() {
    await this.click(SuperCashDashObjects.resultScreen.tryAgainButton.path);
  }

  async clickHomeFromResult() {
    await this.click(SuperCashDashObjects.resultScreen.homeButton.path);
  }
  async increaseCost(){
    await this.click(SuperCashDashObjects.homeScreen.increaseCostButton.path);
  }
  async decreaseCost(){
    await this.click(SuperCashDashObjects.homeScreen.decreaseCostButton.path);
  }

  // ----------------------------
  // Simple helper flow
  // ----------------------------

  /**
   * Minimal starter flow:
   * HOME → (optional HOW TO PLAY) → RANKING → GAMEPLAY
   *
   * Use this while onboarding the game before building any complex loop logic.
   */
  
  async goToGameplaySimple() {
    await this.expectHomeScreenVisible();
    await this.startDemoGame();

    // Some games show How To Play first, some go straight to Ranking.
    // We handle both with a small soft-check.
    const howToPlayContinue = await this.getState(
      SuperCashDashObjects.howToPlayScreen.continueButton.path
    );

    if (this.isClickable(howToPlayContinue)) {
      await this.continueHowToPlay();
    }

    await this.expectRankingScreenVisible();

    // Simplest selection strategy for onboarding:
    // random select → confirm
    await this.randomSelect();
    await this.confirmSelection();

    await this.expectGamePlayScreenVisible();
  }

  /**
   * Minimal single-round play:
   * assumes you are already on the gameplay screen.
   */
  async autoPlayClick() {
    await this.expectGamePlayScreenVisible();
    await this.pressAutoPlay();
    
  const { bonusHandled } = await this.playRoundHandlingBonusIfNeeded({
    timeoutMs: 180000,
    pollMs: 250,
    clickDelayMs: 500,
    bonusSettleTimeoutMs: 4000,
  });

  console.log("Bonus handled:", bonusHandled);

  }
  
  async getTicketCostValue(): Promise<number> {
    const text = await pixi.getPixiObjectTextDeep(
      this.frame,
      SuperCashDashObjects.homeScreenElements.ticketCost.path
    );

    const value = Number(text.replace(/[^\d.]/g, ""));

    if (isNaN(value)) {
      throw new Error(`❌ Ticket cost is not numeric: "${text}"`);
    }

    return value;
  }
  async getWinUpToValue(): Promise<number> {
    const text = await pixi.getPixiObjectTextDeep(
      this.frame,
      SuperCashDashObjects.homeScreenElements.winUpToDisplay.path
    );

    const value = Number(text.replace(/[^\d.]/g, ""));

    if (isNaN(value)) {
      throw new Error(`❌ Win up to value is not numeric: "${text}"`);
    }

    return value;
  }


//Bonus Game Handler

  private getBonusButtonPaths(): string[] {
    return SuperCashDashObjects.bonusGameScreen.symbolButtons.map(
      (button) => button.path
    );
  }
  
async getVisibleBonusButtonPaths(): Promise<string[]> {
    const paths = this.getBonusButtonPaths();

    const states = await Promise.all(
      paths.map(async (path) => {
        try {
          const state = await this.getState(path);
          return { path, state };
        } catch {
          return { path, state: null };
        }
      })
    );

    return states
      .filter(({ state }) => this.isClickable(state))
      .map(({ path }) => path);
  }
  
  async isResultScreenVisible(): Promise<boolean> {
    const tryAgain = SuperCashDashObjects.resultScreen.tryAgainButton.path;
    const homeButton = SuperCashDashObjects.resultScreen.homeButton.path;

    const [tryAgainState, homeState] = await Promise.all([
      this.getState(tryAgain).catch(() => null),
      this.getState(homeButton).catch(() => null),
    ]);

    return this.isClickable(tryAgainState) || this.isClickable(homeState);
  }
  
async clickBonusButtonsUntilDone(options?: {
  maxClicks?: number;
  clickDelayMs?: number;
  settleAfterClickMs?: number;
  settleBeforeStartMs?: number;
}): Promise<void> {
  const maxClicks = options?.maxClicks ?? 4;
  const clickDelayMs = options?.clickDelayMs ?? 300;
  const settleAfterClickMs = options?.settleAfterClickMs ?? 700;
  const settleBeforeStartMs = options?.settleBeforeStartMs ?? 1200;

  // Let the bonus screen finish animating in a bit
  await this.page.waitForTimeout(settleBeforeStartMs);

  const clicked = new Set<string>();
  let clickCount = 0;

  while (clickCount < maxClicks) {
    const visibleButtons = await this.getVisibleBonusButtonPaths();

    console.log(
      `🎁 Visible bonus buttons before click ${clickCount + 1}:`,
      visibleButtons
    );

    const remaining = visibleButtons.filter((path) => !clicked.has(path));

    if (remaining.length === 0) {
      throw new Error(
        `❌ No remaining clickable bonus buttons found after ${clickCount} clicks.`
      );
    }

    const nextPath = remaining[0];

    console.log(`🎁 Clicking bonus button ${clickCount + 1}/${maxClicks}: ${nextPath}`);

    await this.click(nextPath);
    clicked.add(nextPath);
    clickCount++;

    await this.page.waitForTimeout(clickDelayMs);
    await this.page.waitForTimeout(settleAfterClickMs);
  }
}

  
async handleBonusGame(options?: {
  settleTimeoutMs?: number;
  pollMs?: number;
  clickDelayMs?: number;
}): Promise<void> {
  const settleTimeoutMs = options?.settleTimeoutMs ?? 4000;
  const pollMs = options?.pollMs ?? 200;
  const clickDelayMs = options?.clickDelayMs ?? 500;

  let visibleButtons = await this.getVisibleBonusButtonPaths();
  const started = Date.now();

  while (
    visibleButtons.length < 4 &&
    Date.now() - started < settleTimeoutMs
  ) {
    await this.page.waitForTimeout(pollMs);
    visibleButtons = await this.getVisibleBonusButtonPaths();
  }

  if (visibleButtons.length === 0) {
    throw new Error("🎁 Bonus game detected but no clickable bonus buttons were found.");
  }

  console.log("🎁 Bonus buttons ready:", visibleButtons);

  await this.clickBonusButtonsUntilDone({
    maxClicks: 4,
    clickDelayMs,
    settleAfterClickMs: 700,
    settleBeforeStartMs: 1000,
  });
}

  
async playRoundHandlingBonusIfNeeded(options?: {
  timeoutMs?: number;
  pollMs?: number;
  clickDelayMs?: number;
  bonusSettleTimeoutMs?: number;
}): Promise<{ bonusHandled: boolean }> {
  const timeoutMs = options?.timeoutMs ?? 180000; // 3 minutes
  const pollMs = options?.pollMs ?? 250;
  const clickDelayMs = options?.clickDelayMs ?? 500;
  const bonusSettleTimeoutMs = options?.bonusSettleTimeoutMs ?? 4000;

  const started = Date.now();
  let bonusHandled = false;

  while (Date.now() - started < timeoutMs) {
    // 1) Did result arrive?
    if (await this.isResultScreenVisible()) {
      console.log("✅ Result screen reached.");
      return { bonusHandled };
    }

    // 2) Did bonus appear? Only handle once.
    if (!bonusHandled) {
      const visibleBonusButtons = await this.getVisibleBonusButtonPaths();

      if (visibleBonusButtons.length > 0) {
        console.log("🎁 Bonus game detected during autoplay:", visibleBonusButtons);

        await this.handleBonusGame({
          settleTimeoutMs: bonusSettleTimeoutMs,
          pollMs,
          clickDelayMs,
        });

        bonusHandled = true;
      }
    }

    await this.page.waitForTimeout(pollMs);
  }

  throw new Error(
    `❌ Timed out after ${timeoutMs}ms waiting for either bonus game or result screen.`
  );
}
}
