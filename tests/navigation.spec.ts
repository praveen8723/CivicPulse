import { test, expect } from "@playwright/test";

test("home actions lead to reporting, map exploration, and tracking", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".glass-hero-copy")
    .getByRole("link", { name: "Report an issue" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What needs fixing?" }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: /Explore your neighbourhood/ }).click();
  await expect(page).toHaveURL(/\/map$/);
  await page.goto("/");
  await page
    .locator(".glass-hero-copy")
    .getByRole("link", { name: "Track a report" })
    .click();
  await page
    .getByLabel("Case number, tracking reference or report receipt")
    .fill("892");
  await page.getByRole("button", { name: "Track complaint" }).click();
  await expect(
    page.getByRole("heading", { name: "Large pothole near school entrance" }),
  ).toBeVisible();
});

test("citizen insights expand by keyboard and mobile navigation can switch roles", async ({
  page,
}) => {
  await page.goto("/citizen");
  const insights = page.locator(".city-insights");
  await expect(insights).not.toHaveAttribute("open", "");
  await insights.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(insights).toHaveAttribute("open", "");
  await expect(
    page.getByRole("heading", { name: "Reports over the last 14 days" }),
  ).toBeVisible();
  const card = await page.locator(".case-float").boundingBox();
  const toolbar = await page.locator(".stage-bottom").boundingBox();
  expect(card!.y + card!.height).toBeLessThan(toolbar!.y);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#main-navigation")
    .getByRole("link", { name: "Authority view" })
    .click();
  await expect(page).toHaveURL(/\/authority$/);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".city-insights")).toHaveAttribute("open", "");
});
