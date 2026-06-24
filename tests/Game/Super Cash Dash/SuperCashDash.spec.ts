import { expect, test,  } from "@playwright/test";
import * as lobby from "../../helpers/lobbyHelpers";
import * as frameHelpers from "../../helpers/frameHelpers";
import { SuperCashDashDriver } from "./SuperCashDashDriver";
import { createStepHelpers } from "../../helpers/testHelpers";

const GAME_URL = "https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games";


test.only("Super Cash Dash - TRY flow", async ({ page }, testInfo) => {
  test.setTimeout(180_000);


  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
  
  const { stepWithScreenshot } = createStepHelpers(page, testInfo, {
  gameName: "Super Cash Dash",
  scenarioName: "Try-Anonymous",
});

  // await lobby.login(page, "newbie1@luckynumbers.co.nz", "Auckland@1206");
  await lobby.launchGameFromLobby(page, "Super Cash Dash", "TRY");

  const frame = await frameHelpers.waitForGameReady(page, 15_000);
  const game = new SuperCashDashDriver(page, frame);

  await stepWithScreenshot("Load Game", async () => {
    await game.ensureReady();
    await game.expectHomeScreenVisible();
  });

  await stepWithScreenshot("Price Range", async ({takeSubScreenshot }) => {
    const initialCost = await game.getTicketCostValue();

    expect(initialCost).toBeGreaterThan(0);

    const winUpTo = await game.getWinUpToValue();
    expect(winUpTo).toEqual(initialCost * 20000);

    for (let i = 0; i < 3; i++) {
      await game.increaseTicketCostAndExpectNext();
      const currentCost = await game.getTicketCostValue();
      const currentWinUpTo = await game.getWinUpToValue();
      await takeSubScreenshot(`Cost $${currentCost}/Win Up To $${currentWinUpTo}`);
      expect(await game.getWinUpToValue()).toEqual(
        (await game.getTicketCostValue()) * 20000
      );
    }

    const increasedCost = await game.getTicketCostValue();
    expect(increasedCost).toBeGreaterThan(initialCost);

    for (let i = 0; i < 3; i++) {
      await game.decreaseTicketCostAndExpectPrevious();
      const currentCost = await game.getTicketCostValue();
      const currentWinUpTo = await game.getWinUpToValue();
      await takeSubScreenshot(`Cost $${currentCost}/Win Up To $${currentWinUpTo}`);
      expect(await game.getWinUpToValue()).toEqual(
        (await game.getTicketCostValue()) * 20000
      );
    }

    const decreasedCost = await game.getTicketCostValue();
    expect(decreasedCost).toBeLessThan(increasedCost);
  });

  await stepWithScreenshot("Start Game", async () => {
    await game.startDemoGame();
    await game.expectHowToPlayScreenVisible();
  });

  await stepWithScreenshot("Wallet Balance/Demo Mode test", async () => {
    const isDemo = await frameHelpers.isDemoMode(frame);
    console.log("Is Demo Mode:", isDemo);
  });

  await stepWithScreenshot("After How to Play", async () => {
    await game.continueHowToPlay();
    await game.expectRankingScreenVisible();
  });

  await stepWithScreenshot("After Select and Confirm", async () => {
    await game.randomSelect();
    await game.confirmSelection();
    await game.expectGamePlayScreenVisible();
  });

  await stepWithScreenshot("Play Round", async ({takeSubScreenshot} ) => {
    await game.autoPlayClick();
    await takeSubScreenshot("Auto-Button Clicked");
    await game.expectResultScreenVisible();

  });

  await stepWithScreenshot("Try Again", async () => {
    await game.clickTryAgain();
    await game.expectHomeScreenVisible();
  });
});


// This test is focused on verifying the sound toggle functionality in the hamburger menu of Super Cash Dash.
// This test will require manual recording as test evidence is needed to confirm the sound is toggling on and off correctly. Please review the recorded video to ensure the sound toggle is working as expected.
test("Super Cash Dash - sound toggle", async ({ page }) => {
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

  test.setTimeout(180_000);
  // await lobby.login(page, "newbie5@luckynumbers.co.nz", "Auckland@1206");

  await lobby.launchGameFromLobby(page, "Super Cash Dash", "TRY");

  const frame = await frameHelpers.waitForGameReady(page, 15_000);
  const game = new SuperCashDashDriver(page, frame);
  await test.step("Sound Toggle off Test", async () => {
    
    await game.ensureReady();
    await frameHelpers.clickCanvasToPrimeAudio(page, frame); // Ensure audio context is primed for accurate testing
    await game.expectHomeScreenVisible();
    await game.toggleSound();
    await page.waitForTimeout(5000); // Wait a moment to let the sound toggle take effect
    await page.screencast.stop();
  });
    await test.step("Sound Toggle On Test", async () => {
    await game.expectHomeScreenVisible();
    await game.toggleSound();
    await page.waitForTimeout(5000); // Wait a moment to let the sound toggle take effect
    await page.screencast.stop();
  });
});