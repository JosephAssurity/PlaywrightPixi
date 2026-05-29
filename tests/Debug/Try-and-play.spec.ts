import { clickGameButton } from '../helpers/lobbyHelpers';
import { test, expect, Page, Frame } from "@playwright/test";

test('try Bubble Busters', async ({ page }) => {
  await page.goto('https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games');

  await clickGameButton(page, 'Coin Buster', 'TRY');
  
});
