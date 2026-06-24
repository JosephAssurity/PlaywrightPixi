import {test, expect} from "@playwright/test";

test('obs setup', async ({ page }) => {
    await page.goto('https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games');
    await page.pause();
});