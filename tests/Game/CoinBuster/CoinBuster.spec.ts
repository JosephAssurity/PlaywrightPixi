import { expect, test } from "@playwright/test";
import * as lobby from "../../helpers/lobbyHelpers";
import * as frameHelpers from "../../helpers/frameHelpers";
import * as pixi from "../../helpers/pixiHelpers";
import { CoinBusterDriver } from "./CoinBusterDriver";
import CoinBusterObjects from "./CoinbusterPOM";

const GAME_URL = "https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games";

test.only("Coin Buster - TRY flow", async ({ page }) => {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
  
  test.setTimeout(180_000);
  // await lobby.login(page, "newbie5@luckynumbers.co.nz", "Auckland@1206");

  await lobby.launchGameFromLobby(page, "Coin Buster", "TRY");

  const frame = await frameHelpers.waitForGameReady(page, 15_000);

  const game = new CoinBusterDriver(page, frame);

  await game.ensureReady();

  await game.expectHomeScreenVisible();
  
  await game.startDemoGame();
  
  await game.expectTicketCostScreenVisible();
  
  await game.clickPriceTryOrPlay();

  await game.expectGamePlayScreenVisible();
  
  await game.playButtonDriven();

   await game.expectResultscreenVisible();
});

test("Coin Buster - PLAY flow", async ({ page }) => {
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    test.setTimeout(180_000);
  //Login logic may need to be updated depending on the state of the test account and game access
  await lobby.login(page, "newbie27@luckynumbers.co.nz", "Auckland@1206");
  const lobbyBalance = await lobby.getLobbyBalance(page);
  console.log("Lobby balance before game:", lobbyBalance);
  await lobby.launchGameFromLobby(page, "Coin Buster", "PLAY NOW");
    const frame = await frameHelpers.waitForGameReady(page);
    const game = new CoinBusterDriver(page, frame);

  await game.ensureReady();
  let walletBalance = await frameHelpers.getWalletBalance(frame);
   
  console.log("Wallet balance before game:", walletBalance);
  expect(walletBalance).toEqual(lobbyBalance), "Expected wallet balance to be the same as lobby balance after launching game";
  


  await game.expectHomeScreenVisible();
  
  await game.startDemoGame();
  
  await game.expectTicketCostScreenVisible();

  await game.clickPriceTryOrPlay();

  await game.expectGamePlayScreenVisible();

  await game.playButtonDriven();

  await game.expectResultscreenVisible();
});


