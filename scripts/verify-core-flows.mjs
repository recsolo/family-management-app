import { chromium } from "playwright";

const baseUrl = process.env.FAMILYFLOW_BASE_URL ?? "https://family-management-app-production-4d5a.up.railway.app";
const browserChannel = process.env.FAMILYFLOW_BROWSER_CHANNEL ?? "msedge";
const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const email = `core-check-${timestamp}@example.com`;
const password = "FamilyFlowTest123!";
const choreTitle = `Smoke chore ${timestamp}`;
const reminderTitle = `Smoke reminder ${timestamp}`;
const householdName = `Smoke Home ${timestamp}`;
const pantryIngredients = [`smoke-rice-${timestamp}`, `smoke-beans-${timestamp}`];

function getCountFromText(text) {
  const match = text.match(/(\d+)/);
  if (!match) {
    throw new Error(`Could not parse a count from "${text}".`);
  }

  return Number(match[1]);
}

async function readPantryCount(page) {
  const pantryBadge = page
    .locator("article")
    .filter({ hasText: "Recipe suggestions" })
    .getByText(/\d+ pantry items/i)
    .first();
  await pantryBadge.waitFor({ state: "visible", timeout: 15000 });
  return getCountFromText(await pantryBadge.innerText());
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
    await page.getByRole("button", { name: "Create household" }).click();
    await page.getByLabel("Your name").fill("Core Check");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByLabel("Household name").fill(householdName);
    await page.getByRole("button", { name: "Create workspace" }).click();

    await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 30000 });
    results.push({ step: "create-household", ok: true, url: page.url() });

    await page.getByRole("button", { name: /Family Ops/i }).first().click();
    await page.waitForURL(`${baseUrl}/family-ops`, { timeout: 15000 });

    await page.getByLabel("New chore").fill(choreTitle);
    await page.getByRole("button", { name: "Add chore" }).click();
    await page.getByText(choreTitle, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    results.push({ step: "add-chore", ok: true });

    await page.getByRole("button", { name: new RegExp(choreTitle) }).first().click();
    await page.getByRole("button", { name: new RegExp(choreTitle) }).getByText("Done", { exact: true }).waitFor({
      state: "visible",
      timeout: 15000,
    });
    results.push({ step: "toggle-chore", ok: true });

    await page.getByLabel("Reminder").fill(reminderTitle);
    await page.getByLabel("When").fill("Fri 7:45 AM");
    await page.getByRole("button", { name: "Add reminder" }).click();
    await page.getByText(reminderTitle, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    results.push({ step: "add-reminder", ok: true });

    await page.getByRole("button", { name: /Meal Planner/i }).first().click();
    await page.waitForURL(`${baseUrl}/meal-planner`, { timeout: 15000 });
    const pantryCountBefore = await readPantryCount(page);
    await page.getByLabel("Add ingredients").fill(pantryIngredients.join(", "));
    await page.getByRole("button", { name: "Add pantry items" }).click();
    await page.waitForFunction(
      ({ beforeCount }) => {
        const articles = [...document.querySelectorAll("article")];
        const recipeCard = articles.find((article) => article.textContent?.includes("Recipe suggestions"));
        const text = recipeCard?.textContent ?? "";
        const match = text.match(/(\d+)\s+pantry items/i);
        return match ? Number(match[1]) >= beforeCount + 2 : false;
      },
      { beforeCount: pantryCountBefore },
      { timeout: 15000 },
    );
    results.push({ step: "add-pantry-items", ok: true, before: pantryCountBefore });

    await page.getByRole("button", { name: /Budget Lab/i }).first().click();
    await page.waitForURL(`${baseUrl}/budget-lab`, { timeout: 15000 });
    await page.getByLabel("Monthly take-home income").fill("6800");
    await page.getByLabel("Family size").fill("4");
    const incomeValue = await page.getByLabel("Monthly take-home income").inputValue();
    const familySizeValue = await page.getByLabel("Family size").inputValue();
    if (incomeValue !== "6800" || familySizeValue !== "4") {
      throw new Error("Budget inputs did not persist after editing.");
    }
    results.push({ step: "edit-budget-inputs", ok: true });

    await page.getByRole("button", { name: /AI Studio/i }).first().click();
    await page.waitForURL(`${baseUrl}/ai-studio`, { timeout: 15000 });
    await page.getByText("Talk to the family assistant.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("button", { name: /Plan a calm weeknight for our family/i }).waitFor({
      state: "visible",
      timeout: 15000,
    });
    results.push({ step: "open-ai-studio", ok: true });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ email, householdName, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
