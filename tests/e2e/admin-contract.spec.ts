import { expect, test, type Page } from "@playwright/test";

const hasAdminCredentials = Boolean(
  process.env.CMS_E2E_ADMIN_EMAIL && process.env.CMS_E2E_ADMIN_PASSWORD,
);

async function loginAsAdmin(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(process.env.CMS_E2E_ADMIN_EMAIL!);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.CMS_E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("CMS admin contract smoke", () => {
  test("orders page exposes shipment management workflow", async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Set CMS_E2E_ADMIN_EMAIL and CMS_E2E_ADMIN_PASSWORD to run authenticated admin contract smoke tests",
    );

    await loginAsAdmin(page);
    await page.goto("/orders");

    await expect(page.getByRole("heading", { name: "Orders Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Update Shipment" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update Shipment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shipment Tracking Sync" })).toBeVisible();
  });

  test("payments page exposes run and report actions", async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Set CMS_E2E_ADMIN_EMAIL and CMS_E2E_ADMIN_PASSWORD to run authenticated admin contract smoke tests",
    );

    await loginAsAdmin(page);
    await page.goto("/payments");

    await expect(page.getByRole("heading", { name: "Payments Admin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Reconcile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load Report" }).first()).toBeVisible();
  });

  test("core update pages render", async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Set CMS_E2E_ADMIN_EMAIL and CMS_E2E_ADMIN_PASSWORD to run authenticated admin contract smoke tests",
    );

    await loginAsAdmin(page);

    await page.goto("/challenges");
    await expect(page.getByRole("heading", { name: "Challenges Admin" })).toBeVisible();

    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();

    await page.goto("/rewards");
    await expect(page.getByRole("heading", { name: "Rewards Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rewards List" })).toBeVisible();
  });
});
