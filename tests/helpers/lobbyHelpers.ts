import { expect, Page } from "@playwright/test";

const GAME_IFRAME = 'iframe[title="Instant Kiwi Game"]';

export async function clickGameButton(
  page: Page,
  gameName: string,
  action: "TRY" | "PLAY NOW"
) {
  const card = page
    .locator(".lnz-ik-two-up__wrapper")
    .filter({
      has: page.locator(`img[alt="${gameName}"]`),
    })
    .first();

  const button = card.getByRole("button", { name: action });

  await expect(card).toBeVisible({ timeout: 15000 });
  await card.scrollIntoViewIfNeeded();

  await expect(button).toBeVisible({ timeout: 15000 });
  await expect(button).toBeEnabled({ timeout: 15000 });

  await button.click();
}

export async function launchGameFromLobby(
  page: Page,
  gameName: string,
  action: "TRY" | "PLAY NOW"
) {
  await clickGameButton(page, gameName, action);

  // Wait for the app response after click
  await page.locator(GAME_IFRAME).waitFor({
    state: "attached",
    timeout: 20000,
  });

  await expect(page.locator(GAME_IFRAME)).toBeVisible({
    timeout: 20000,
  });
}

export async function login(page: Page, email: string, password: string) {

  await page.getByText("Log in").first().click();

  const emailInput = page.getByPlaceholder("Email");
  const passInput = page.getByPlaceholder("Password");
  const submitBtn = page.locator('[data-test-automation-id="login-form-login-button"]');

  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await expect(passInput).toBeVisible({ timeout: 15000 });

  await emailInput.fill(email);
  await passInput.fill(password);

  await expect(submitBtn).toBeEnabled({ timeout: 15000 });
  await submitBtn.click();

  // ✅ Strong post-condition: account icon appears (logged-in UI)
  const accountIcon = page.locator("svg.nav-menu-account–link").first();
  await expect(accountIcon).toBeVisible({ timeout: 20000 });

}
  // Additional helper to get balance from the lobby header, if needed in tests
  export async function getLobbyBalance(page: Page): Promise<number> {
    const locator = page.locator('[data-test-automation-id="header-menu-balance"]');

    await locator.waitFor({ state: "visible", timeout: 5000 });

    const text = await locator.innerText();

    // "$603.98" → 603.98
    return Number(text.replace(/[^\d.]/g, ""));
  }
