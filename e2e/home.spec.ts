import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders the application title", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "AI Revenue Recovery Agent",
        level: 1,
      }),
    ).toBeVisible();
  });

  test("health API returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      status: string;
      service: string;
    };

    expect(body.status).toBe("ok");
    expect(body.service).toBe("AI Revenue Recovery Agent");
  });
});
