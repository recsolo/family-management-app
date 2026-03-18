import { chromium } from "playwright";

const baseUrl = process.env.FAMILYFLOW_BASE_URL ?? "https://family-management-app-production-4d5a.up.railway.app";
const browserChannel = process.env.FAMILYFLOW_BROWSER_CHANNEL ?? "msedge";
const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const email = `route-check-${timestamp}@example.com`;
const password = "FamilyFlowTest123!";

const routeChecks = [
  {
    label: "Today",
    path: "/dashboard",
    expectedText: "Appointments for today",
    unexpectedText: "Add a chore",
  },
  {
    label: "Game Room",
    path: "/game-room",
    expectedText: "Family Star Sprint",
    unexpectedText: "Budget settings",
  },
  {
    label: "Family Inbox",
    path: "/family-inbox",
    expectedText: "Needs your eye",
    unexpectedText: "What is in the kitchen?",
  },
  {
    label: "Family Ops",
    path: "/family-ops",
    expectedText: "Add a chore",
    unexpectedText: "What is in the kitchen?",
  },
  {
    label: "Meal Planner",
    path: "/meal-planner",
    expectedText: "What is in the kitchen?",
    unexpectedText: "Budget settings",
  },
  {
    label: "Budget Lab",
    path: "/budget-lab",
    expectedText: "Budget settings",
    unexpectedText: "Family members",
  },
  {
    label: "Family Room",
    path: "/family-room",
    expectedText: "Family members",
    unexpectedText: "Talk to FamilyFlow.",
  },
  {
    label: "Partner Space",
    path: "/partner-space",
    expectedText: "Choose the pair",
    unexpectedText: "What is in the kitchen?",
  },
  {
    label: "AI Studio",
    path: "/ai-studio",
    expectedText: "Talk to FamilyFlow.",
    unexpectedText: "Appointments for today",
  },
];

async function navigateWithMenu(page, label, path) {
  await page.getByRole("button", { name: /Menu/i }).click();
  const menu = page.getByRole("dialog", { name: "Page navigation" });
  await menu.waitFor({ state: "visible", timeout: 15000 });
  await menu.getByRole("button", { name: new RegExp(label, "i") }).first().click();
  await page.waitForURL(`${baseUrl}${path}`, { timeout: 15000 });
}

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
    await page.getByRole("button", { name: "Create family" }).click();
    await page.getByLabel("Your name").fill("Route Check");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Household name").fill("Route Check Home");
    await page.getByRole("button", { name: "Create family space" }).click();

    await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 30000 });
    await page.getByText("Appointments for today", { exact: true }).first().waitFor({
      state: "visible",
      timeout: 30000,
    });

    for (const check of routeChecks) {
      await navigateWithMenu(page, check.label, check.path);
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

    await page.getByRole("button", { name: /Open chat-only view/i }).first().click();
    await page.waitForURL(`${baseUrl}/ai-chat`, { timeout: 15000 });
    await page.getByText("Just you and FamilyFlow.", { exact: true }).first().waitFor({
      state: "visible",
      timeout: 15000,
    });

    results.push({
      path: "/ai-chat",
      expectedVisible: await page.getByText("Just you and FamilyFlow.", { exact: true }).first().isVisible(),
      unexpectedVisible: await page.getByText("Navigate the workspace", { exact: true }).isVisible().catch(() => false),
      url: page.url(),
    });
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
