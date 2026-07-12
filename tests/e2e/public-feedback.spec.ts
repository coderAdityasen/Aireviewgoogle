import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_APP_URL, "Set E2E_APP_URL against a seeded Supabase-backed deployment.");

test("customer can generate, copy and open Google flow", async ({ page }) => {
  await page.goto("/r/demo-business?campaign=demo-token");
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Your experience details").fill("The food matched my order and the pickup process was simple.");
  await page.getByLabel(/genuine experience/i).check();
  await page.getByRole("button", { name: /generate review options/i }).click();
  await expect(page.getByText(/Choose a review to copy/i)).toBeVisible();
  await page.getByRole("button", { name: /copy review option 1/i }).click();
  await expect(page.getByText(/Your review text has been copied/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue to Google Reviews/i })).toBeEnabled();
});
