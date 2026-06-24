import { test, Page, TestInfo } from "@playwright/test";

type ScreenshotOptions = {
  delayMs?: number;
  fullPage?: boolean;
  attachToReport?: boolean;
};

type StepHelperConfig = {
  gameName: string;
  scenarioName: string;
  rootFolder?: string;
};

type StepContext = {
  takeSubScreenshot: (subName: string, options?: ScreenshotOptions) => Promise<string>;
  stepNumber: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createStepHelpers(
  page: Page,
  testInfo: TestInfo,
  config: StepHelperConfig
) {
  let stepIndex = 0;

  const rootFolder = config.rootFolder ?? "StepScreenshots";
  const gameFolder = slugify(config.gameName);
  const scenarioFolder = slugify(config.scenarioName);
  const baseFolder = `${rootFolder}/${gameFolder}/${scenarioFolder}`;

  async function saveScreenshotFile(
    fileName: string,
    attachName: string,
    options?: ScreenshotOptions
  ) {
    await page.waitForTimeout(options?.delayMs ?? 1000);

    const filePath = testInfo.outputPath(`${baseFolder}/${fileName}`);

    await page.screenshot({
      path: filePath,
      fullPage: options?.fullPage ?? false,
    });

    if (options?.attachToReport ?? true) {
      await testInfo.attach(attachName, {
        path: filePath,
        contentType: "image/png",
      });
    }

    return filePath;
  }

  /**
   * Global screenshot outside of a test step.
   * This increments the main step counter.
   */
  async function takeScreenshot(
    name: string,
    options?: ScreenshotOptions
  ) {
    const stepNumber = String(++stepIndex).padStart(2, "0");
    const fileName = `${stepNumber}-${slugify(name)}.png`;
    const attachName = `${stepNumber} ${name}`;

    return await saveScreenshotFile(fileName, attachName, options);
  }

  /**
   * Step wrapper with optional nested screenshots.
   */
  async function stepWithScreenshot(
    name: string,
    action: ((ctx: StepContext) => Promise<void>) | (() => Promise<void>),
    options?: ScreenshotOptions & {
      finalScreenshot?: boolean;
    }
  ) {
    const stepNumber = String(++stepIndex).padStart(2, "0");
    let subStepIndex = 0;

    const takeSubScreenshot = async (
      subName: string,
      subOptions?: ScreenshotOptions
    ) => {
      const subNumber = String(++subStepIndex).padStart(2, "0");
      const fileName = `${stepNumber}-${subNumber}-${slugify(name)}-${slugify(subName)}.png`;
      const attachName = `${stepNumber}-${subNumber} ${name} ${subName}`;

      return await saveScreenshotFile(fileName, attachName, subOptions);
    };

    await test.step(name, async () => {
      let stepError: unknown;

      try {
        if (action.length > 0) {
          await (action as (ctx: StepContext) => Promise<void>)({
            takeSubScreenshot,
            stepNumber,
          });
        } else {
          await (action as () => Promise<void>)();
        }
      } catch (err) {
        stepError = err;
      }

      // Optional final overall screenshot for the step itself
      if (options?.finalScreenshot ?? true) {
        const fileName = `${stepNumber}-${slugify(name)}.png`;
        const attachName = `${stepNumber} ${name}`;
        await saveScreenshotFile(fileName, attachName, options);
      }

      if (stepError) {
        throw stepError;
      }
    });
  }

  return {
    stepWithScreenshot,
    takeScreenshot,
    baseFolder,
  };
}
