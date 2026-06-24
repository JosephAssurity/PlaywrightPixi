import { BaseSgDriver } from "../../Base/BaseSgDriver";
import { expect, test,  } from "@playwright/test";
import * as pixi from "../../helpers/pixiHelpers";
import MonopolyPropertyPayoutObjects from "./MonopolyPropertyPayoutPOM";



export class MonopolyPropertyPayoutDriver extends BaseSgDriver {

  // ----------------------------
  // Screen assertions
  // ----------------------------
  async expectHomeScreenVisible() {
    const path = MonopolyPropertyPayoutObjects.homeScreen.tryButton.path;

    await this.expectScreen(
      "HOME",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectHowToPlayScreenVisible() {
    const path = MonopolyPropertyPayoutObjects.howToPlayScreen.continueButton.path;

    await this.expectScreen(
      "HOW TO PLAY",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectGameplayScreenVisible() {
    const path = MonopolyPropertyPayoutObjects.gameplayScreen.playButton.path;

    await this.expectScreen(
      "GAMEPLAY",
      async () => this.isClickable(await this.getState(path)),
      [path]
    );
  }

  async expectResultScreenVisible(timeout = 120000) {
    const tryAgain = MonopolyPropertyPayoutObjects.resultScreen.tryAgainButton.path;
    const homeButton = MonopolyPropertyPayoutObjects.resultScreen.homeButton.path;

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

  async expectHamburgerMenuVisible() {
    const path = MonopolyPropertyPayoutObjects.hamburgerBar.soundButton.path;

    await this.expectScreen(
      "HAMBURGER",
      async () => this.isClickable(await this.getState(path)),
      [path]
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

  // ----------------------------
  // Basic actions
  // ----------------------------
  async startDemoGame() {
    await this.click(MonopolyPropertyPayoutObjects.homeScreen.tryButton.path);
  }

  async openHamburgerMenu() {
    await this.click(MonopolyPropertyPayoutObjects.homeScreen.hamburgerButton.path);
  }

  async toggleSound() {
    await this.openHamburgerMenu();
    await this.expectHamburgerMenuVisible();
    await this.click(MonopolyPropertyPayoutObjects.hamburgerBar.soundButton.path);
    await this.click(MonopolyPropertyPayoutObjects.hamburgerBar.homeButton.path);
  }

  async continueHowToPlay() {
    await this.click(MonopolyPropertyPayoutObjects.howToPlayScreen.continueButton.path);
  }

  async confirmSelection() {
    await this.click(MonopolyPropertyPayoutObjects.gameTokenSelectionScreen.confirmSelectionButton.path);
  }

  async pressPlay() {
    await this.click(MonopolyPropertyPayoutObjects.gameplayScreen.playButton.path);
  }

  async pressAutoPlay() {
    await this.click(MonopolyPropertyPayoutObjects.gameplayScreen.autoPlayButton.path);
  }

  async clickTryAgain() {
    await this.click(MonopolyPropertyPayoutObjects.resultScreen.tryAgainButton.path);
  }

  async clickHomeFromResult() {
    await this.click(MonopolyPropertyPayoutObjects.resultScreen.homeButton.path);
  }

  async increaseCost() {
    await this.click(MonopolyPropertyPayoutObjects.homeScreen.increaseCostButton.path);
  }

  async decreaseCost() {
    await this.click(MonopolyPropertyPayoutObjects.homeScreen.reduceCostButton.path);
  }

  // ----------------------------
  // Simple flow
  // ----------------------------
  async goToGameplaySimple() {
    await this.expectHomeScreenVisible();
    await this.startDemoGame();

    const howToPlayContinue = await this.getState(
      MonopolyPropertyPayoutObjects.howToPlayScreen.continueButton.path
    );

    if (this.isClickable(howToPlayContinue)) {
      await this.continueHowToPlay();
    }

    await this.confirmSelection();
    await this.expectGameplayScreenVisible();
  }

  async autoPlayOnce() {
    await this.expectGameplayScreenVisible();
    await this.pressAutoPlay();
    await this.expectResultScreenVisible();
  }
    async getTicketCostValue(): Promise<number> {
      const text = await pixi.getPixiObjectTextDeep(
        this.frame,
        MonopolyPropertyPayoutObjects.homeScreenElements.ticketCost.path
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
          MonopolyPropertyPayoutObjects.homeScreenElements.winUpToDisplay.path
        );
    
        const value = Number(text.replace(/[^\d.]/g, ""));
    
        if (isNaN(value)) {
          throw new Error(`❌ Win up to value is not numeric: "${text}"`);
        }
    
        return value;
      }
      private readonly ticketCostSequence = [0.5, 1, 2, 5, 10];
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
          MonopolyPropertyPayoutObjects.homeScreen.increaseCostButton.path,
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
          MonopolyPropertyPayoutObjects.homeScreen.reduceCostButton.path,
        );
      
        await this.expectTicketCostValue(expectedPrevious);
      }
}
