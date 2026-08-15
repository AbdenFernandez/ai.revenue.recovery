import { test, expect } from "@playwright/test";

test.describe("Customer Ingestion & Management", () => {
  test("unauthenticated user accessing /dashboard/customers is redirected to login", async ({
    page,
  }) => {
    await page.goto("/dashboard/customers");
    await expect(page).toHaveURL(/.*login/);
  });
});
