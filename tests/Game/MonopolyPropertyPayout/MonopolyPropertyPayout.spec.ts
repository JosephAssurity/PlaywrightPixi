import { expect, test,  } from "@playwright/test";
import * as lobby from "../../helpers/lobbyHelpers";
import * as frameHelpers from "../../helpers/frameHelpers";
import { MonopolyPropertyPayoutDriver } from "./MonopolyPropertyPayoutDriver";
import { createStepHelpers } from "../../helpers/testHelpers";

const GAME_URL = "https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games";


test.only("Monopoly Property Payout - TRY flow", async ({ page }, testInfo) => {
  test.setTimeout(180_000);


  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
  
  const { stepWithScreenshot } = createStepHelpers(page, testInfo, {
  gameName: "Monopoly Property Payout",
  scenarioName: "Try-Anonymous",
});

  // await lobby.login(page, "newbie1@luckynumbers.co.nz", "Auckland@1206");
  await lobby.launchGameFromLobby(page, "MONOPOLY Property Payout", "TRY");

  const frame = await frameHelpers.waitForGameReady(page, 15_000);
  const game = new MonopolyPropertyPayoutDriver(page, frame);

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

    for (let i = 0; i < 4; i++) {
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
});