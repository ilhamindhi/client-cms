import { expect, test } from "@playwright/test";

test.describe("CMS smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: "CMS Login" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("unauthenticated user is redirected to login from protected route", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admins");
    await expect(page).toHaveURL(/\/auth\/login(\?.*)?$/);
    await expect(page.getByRole("heading", { name: "CMS Login" })).toBeVisible();
  });

  test("unauthenticated user is redirected to login from nutrition route", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/nutrition");
    await expect(page).toHaveURL(/\/auth\/login(\?.*)?$/);
    await expect(page.getByRole("heading", { name: "CMS Login" })).toBeVisible();
  });

  test("seed admin can login and access dashboard", async ({ page }) => {
    test.skip(
      !process.env.CMS_E2E_ADMIN_EMAIL || !process.env.CMS_E2E_ADMIN_PASSWORD,
      "Set CMS_E2E_ADMIN_EMAIL and CMS_E2E_ADMIN_PASSWORD to run authenticated smoke test",
    );

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(process.env.CMS_E2E_ADMIN_EMAIL!);
    await page.locator('input[autocomplete="current-password"]').fill(process.env.CMS_E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Analytics Dashboard" })).toBeVisible();
  });
});
