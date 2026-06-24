import { expect } from "@playwright/test";
import { BasePixiDriver } from "./BasePixiDriver";
import * as pixi from "../helpers/pixiHelpers"

export abstract class BaseSgDriver extends BasePixiDriver {
  /**
   * Vendor-specific clickable rule:
   * dynamic OR static eventMode counts as clickable.
   * Useful for Spine/button objects that don't behave like plain Pixi clickLayers.
   */
  protected override isClickable(state: any) {
    return Boolean(
      state &&
        state.exists &&
        state.visible !== false &&
        state.renderable !== false &&
        state.worldAlpha > 0 &&
        state.interactive === true &&
        (state.eventMode === "dynamic" || state.eventMode === "static")
    );
  }

  /**
   * Override click() so this vendor does NOT rely on the generic pixi helper's
   * old hardcoded "static only" logic.
   */
  protected override async click(path: string) {
    await this.waitForSgButton(path);
    await pixi.emitPixiClickByPath(this.frame, path);
  }


}