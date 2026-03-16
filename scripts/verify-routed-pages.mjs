import { chromium } from "playwright";

const baseUrl = process.env.FAMILYFLOW_BASE_URL ?? "https://family-management-app-production-4d5a.up.railway.app";
const browserChannel = process.env.FAMILYFLOW_BROWSER_CHANNEL ?? "msedge";
const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const email = `route-check-${timestamp}@example.com`;
const password = "FamilyFlowTest123!";

const routeChecks = [
  {
    label: "Dashboard",
    path: "/dashboard",
    expectedText: "Tonight's dinner signal",
    unexpectedText: "Chore composer",
  },
  {
    label: "Family Ops",
    path: "/family-ops",
    expectedText: "Chore composer",
    unexpectedText: "Pantry inventory",
  },
  {
    label: "Meal Planner",
    path: "/meal-planner",
    expectedText: "Pantry inventory",
    unexpectedText: "Planner inputs",
  },
  {
    label: "Budget Lab",
    path: "/budget-lab",
    expectedText: "Planner inputs",
    unexpectedText: "Household members",
  },
  {
    label: "Family Room",
    path: "/family-room",
    expectedText: "Household members",
    unexpectedText: "Talk to the family assistant",
  },
  {
    label: "AI Studio",
    path: "/ai-studio",
    expectedText: "Talk to the family assistant.",
    unexpectedText: "Tonight's dinner signal",
  },
];

async function main() {
  const browser = await chromium.launch({
    channel: browserChannel,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });

  const page = await context.newPage();
  const results = [];

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Create household" }).click();
    await page.getByLabel("Your name").fill("Route Check");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Household name").fill("Route Check Home");
    await page.getByRole("button", { name: "Create workspace" }).click();

    await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 30000 });
    await page.getByText("Tonight's dinner signal", { exact: true }).first().waitFor({
      state: "visible",
      timeout: 30000,
    });

    for (const check of routeChecks) {
      await page.getByRole("button", { name: new RegExp(check.label, "i") }).first().click();
      await page.waitForURL(`${baseUrl}${check.path}`, { timeout: 15000 });
      await page.getByText(check.expectedText, { exact: true }).first().waitFor({
        state: "visible",
        timeout: 15000,
      });

      const expectedVisible = await page.getByText(check.expectedText, { exact: true }).first().isVisible();
      const unexpectedVisible = await page.getByText(check.unexpectedText, { exact: true }).isVisible().catch(() => false);

      results.push({
        path: check.path,
        expectedVisible,
        unexpectedVisible,
        url: page.url(),
      });
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ email, results }, null, 2));

  const failed = results.some((result) => !result.expectedVisible || result.unexpectedVisible);
  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
