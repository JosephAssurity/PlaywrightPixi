import { Page, Frame, expect } from "@playwright/test";
import * as pixi from "../helpers/pixiHelpers"
import * as fs from "fs";
import * as nodePath from "path";

export abstract class BasePixiDriver {
  constructor(
    protected page: Page,
    protected frame: Frame
  ) {}

  // ----------------------------
  // Setup
  // ----------------------------

  async ensureReady() {
    await pixi.ensurePixiHelpers(this.frame);
  }

  // ----------------------------
  // Core interactions
  // ----------------------------

  /**
   * Standard Pixi click for button-like objects.
   * This uses the shared pixi helper wait.
   *
   * NOTE:
   * If a particular vendor needs a different clickability wait strategy,
   * override click() in the vendor base class.
   */
  protected async click(path: string) {
    await pixi.waitForPixiObjectReadyToClick(this.frame, path);
    await pixi.clickPixiObjectByPath(this.page, this.frame, path);
  }

  /**
   * Passive wait for an on-screen Pixi object.
   * If your helper is named differently, swap this implementation.
   */
  protected async waitFor(path: string) {
    await pixi.waitPixiObjectOnScreen(this.frame, path);
  }

  /**
   * Safe state fetch.
   */
  protected async getState(path: string) {
    return await pixi.getPixiObjectState(this.frame, path).catch(() => null);
  }

  // ----------------------------
  // Shared predicates
  // ----------------------------

  /**
   * Vendor-specific clickable definition.
   * Concrete vendor base classes MUST override this.
   */
  protected abstract isClickable(state: any): boolean;

  /**
   * Alias for readability in progress-GO logic.
   */
  protected isActiveGo(state: any) {
    return this.isClickable(state);
  }

  /**
   * Bounds-based visibility helper for non-button content.
   * Can still be useful for text/content-based checks.
   */
  protected isVisibleContent(state: any) {
    return Boolean(
      state &&
        state.exists &&
        state.worldAlpha > 0 &&
        state.width > 0 &&
        state.height > 0
    );
  }

  // ----------------------------
  // Reusable assertion helper
  // ----------------------------

  protected async expectScreen(
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

      const screenshotOnFail = opts?.screenshotOnFail ?? true;
      if (screenshotOnFail) {
        const dir =
          opts?.screenshotDir ?? nodePath.join(process.cwd(), "test-artifacts");

        fs.mkdirSync(dir, { recursive: true });

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const base = `${name}-${stamp}`;

        try {
          await this.page.screenshot({
            path: nodePath.join(dir, `${base}-full.png`),
            fullPage: true,
          });

          await this.frame.locator("canvas").screenshot({
            path: nodePath.join(dir, `${base}-canvas.png`),
          });

          console.error(`📸 Saved screenshots to: ${dir}`);
        } catch (shotErr) {
          console.error("⚠️ Failed to capture screenshots:", shotErr);
        }
      }

      const states = await Promise.all(
        debugPaths.map((p) => this.getState(p))
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
                width: s.width,
                height: s.height,
                x: s.x,
                y: s.y,
              }
            : "null"
        );
      });

      const error = new Error(`❌ Expected ${name} screen but it did not appear`);
      (error as any).cause = e;
      throw error;
    }
  }

  // ----------------------------
  // Shared bonus helper
  // ----------------------------

  /**
   * TEST-FRIENDLY:
   * Tap a Pixi button repeatedly until it becomes NOT clickable.
   * - Stops on !clickable
   * - Uses maxTaps as safety cap
   */
  protected async tapUntilNotClickable(
    label: string,
    path: string,
    maxTaps = 12,
    settleMs = 250
  ) {
    for (let i = 1; i <= maxTaps; i++) {
      const state = await this.getState(path);

      if (!this.isClickable(state)) {
        console.log(`${label}: became NOT clickable → stop (after ${i - 1} taps)`);
        return;
      }

      console.log(`${label}: tap ${i}/${maxTaps}`);
      await pixi.clickPixiObjectByPath(this.page, this.frame, path);

      await this.page.waitForTimeout(settleMs);
    }

    console.log(`${label}: reached maxTaps=${maxTaps} → stop`);
  }

  // ----------------------------
  // Failure artifacts
  // ----------------------------

  protected async captureFailureArtifacts(tag: string) {
    const dir = nodePath.join(process.cwd(), "test-artifacts");
    fs.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `${tag}-${stamp}`;

    try {
      await this.page.screenshot({
        path: nodePath.join(dir, `${base}-full.png`),
        fullPage: true,
      });

      await this.frame.locator("canvas").screenshot({
        path: nodePath.join(dir, `${base}-canvas.png`),
      });

      console.error(`📸 Saved failure screenshots: ${nodePath.join(dir, base)}-*`);
    } catch (err) {
      console.error("⚠️ Failed to capture screenshots:", err);
    }
  }
  //use for SG's dynamic clickable buttons that don't follow the standard pixi helper wait logic
  protected async waitForSgButton(path: string, timeout = 10000) {
  await expect.poll(async () => {
    const state = await pixi.getPixiObjectState(this.frame, path).catch(() => null);

    return Boolean(
      state &&
        state.exists &&
        state.visible !== false &&
        state.renderable !== false &&
        state.worldAlpha > 0 &&
        state.interactive === true &&
        (state.eventMode === "dynamic" || state.eventMode === "static")
    );
  }, {
    timeout,
    message: `Waiting for button to become clickable: ${path}`,
  }).toBe(true);
}
}

