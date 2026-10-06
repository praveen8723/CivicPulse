import { test, expect } from "@playwright/test";

test("dropdown search, keyboard selection, dismissal and focus work", async ({
  page,
}) => {
  await page.goto("/map");
  const category = page.getByRole("combobox", {
    name: "Category filter",
    exact: true,
  });
  await category.focus();
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollBefore);
  await expect(
    page.getByRole("combobox", { name: "Search options", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("combobox", { name: "Search options", exact: true })
    .fill("Water Leakage");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(category).toHaveText("Water Leakage");
  await expect(category).toBeFocused();
  await expect(page.locator(".map-list-item")).toHaveCount(7);
  await category.click();
  await page
    .getByRole("combobox", { name: "Search options", exact: true })
    .fill("does-not-exist");
  await expect(page.getByText("No matching options")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(category).toBeFocused();
  const severity = page.getByRole("combobox", {
    name: "Severity filter",
    exact: true,
  });
  await severity.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(severity).toHaveText("Critical");
  await severity.click();
  await expect(
    page.getByRole("option", { name: "Critical", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator("h1").click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("mobile dropdown fits the viewport and changes language through the custom menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language", exact: true }).click();
  const popup = await page.getByRole("listbox").boundingBox();
  expect(popup!.x).toBeGreaterThanOrEqual(0);
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: "test-results/mobile-dropdown.png" });
  await page.getByRole("option", { name: "ಕನ್ನಡ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "kn");
  await expect(page.locator("h1")).toContainText("ಸಣ್ಣ ಹೆಜ್ಜೆಗಳು");
  await page.reload();
  await page.getByRole("combobox", { name: "ಭಾಷೆ", exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("one-minute video plays and seeks on the homepage and in the demo guide", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const home = page.locator("#walkthrough");
  await home.scrollIntoViewIfNeeded();
  await home
    .getByRole("button", { name: "Play the one-minute walkthrough" })
    .click();
  const video = home.locator("video");
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).duration),
    )
    .toBeCloseTo(60, 0);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);
  await home.getByRole("button", { name: "06 Track", exact: true }).click();
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThanOrEqual(45);
  await page.getByRole("button", { name: "Demo guide", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("video")).toBeVisible();
  await dialog.getByRole("button", { name: "03 Locate", exact: true }).click();
  await expect
    .poll(() =>
      dialog
        .locator("video")
        .evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThanOrEqual(21);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).paused),
    )
    .toBe(true);
  await dialog
    .locator("video")
    .evaluate((element) => (element as HTMLVideoElement).pause());
  await page.screenshot({ path: "test-results/demo-guide-video.png" });
  await page.setViewportSize({ width: 375, height: 812 });
  const mobileDialog = await dialog.boundingBox();
  expect(mobileDialog!.x).toBeGreaterThanOrEqual(0);
  expect(mobileDialog!.x + mobileDialog!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: "test-results/mobile-demo-guide.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
