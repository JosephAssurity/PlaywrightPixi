
import { BasePixiDriver } from "./BasePixiDriver";

export abstract class BaseIwgDriver extends BasePixiDriver {
  protected override isClickable(state: any) {
    return Boolean(
      state &&
        state.exists &&
        state.visible !== false &&
        state.renderable !== false &&
        state.worldAlpha > 0 &&
        state.interactive === true &&
        state.eventMode === "static"
    );
  }
}
