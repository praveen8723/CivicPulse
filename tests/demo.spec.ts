import { test, expect } from "@playwright/test";

test("map total zooms into separate issue type totals", async ({ page }) => {
  await page.goto("/map");
  await page.evaluate(() => {
    const key = "civicpulse-demo-v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    const sample = state.issues[0];
    const atJunction = {
      ...sample,
      latitude: 12.9716,
      longitude: 77.5946,
      address: "Demo Junction",
      ward: "Demo",
      status: "Reported",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.issues = [
      {
        ...atJunction,
        id: "CASE-9901",
        title: "Rainwater covering Demo Junction",
        category: "Waterlogging",
        reporterCount: 6,
      },
      {
        ...atJunction,
        id: "CASE-9902",
        title: "Garbage piled at Demo Junction",
        category: "Garbage / Waste",
        reporterCount: 2,
      },
      {
        ...atJunction,
        id: "CASE-9903",
        title: "Traffic queue elsewhere",
        category: "Traffic / Congestion",
        latitude: 13.08,
        longitude: 77.75,
        address: "Far Junction",
        reporterCount: 1,
      },
    ];
    state.history = [];
    state.reports = [];
    state.notes = [];
    state.confirmations = [];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator(".vector-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  const combined = page.locator(
    '.report-cluster-marker[aria-label^="8 reports"]',
  );
  await expect(combined).toHaveCount(1);
  await combined.click();
  const water = page.locator(
    '.signal-marker[aria-label^="Waterlogging, 6 reports"]',
  );
  const waste = page.locator(
    '.signal-marker[aria-label^="Garbage / Waste, 2 reports"]',
  );
  await expect(water).toBeVisible();
  await expect(waste).toBeVisible();
  await expect(water.locator(".signal-category-label")).toHaveText(
    "Waterlogging",
  );
  await expect(waste.locator(".signal-category-label")).toHaveText(
    "Garbage / Waste",
  );
  const waterBox = await water.boundingBox();
  const wasteBox = await waste.boundingBox();
  expect(waterBox && wasteBox).toBeTruthy();
  expect(
    Math.hypot(waterBox!.x - wasteBox!.x, waterBox!.y - wasteBox!.y),
  ).toBeGreaterThan(40);
});

test("map repairs duplicate saved case IDs before rendering", async ({
  page,
}) => {
  const duplicateWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("two children with the same key"))
      duplicateWarnings.push(message.text());
  });
  await page.goto("/map");
  await page.evaluate(() => {
    const key = "civicpulse-demo-v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    const issue = state.issues.find(
      (item: { id: string }) => item.id === "CP-2026-0940",
    );
    state.issues.push({ ...issue, reporterCount: issue.reporterCount + 1 });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator(".map-list-item")).toHaveCount(48);
  expect(duplicateWarnings).toEqual([]);
  expect(
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("civicpulse-demo-v1")!);
      return state.issues.filter(
        (item: { id: string }) => item.id === "CP-2026-0940",
      ).length;
    }),
  ).toBe(1);
});

test("language selection persists across pages and resolved demos show paired illustrative evidence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("language-select").selectOption("kn");
  await expect(page.locator("html")).toHaveAttribute("lang", "kn");
  await expect(page.locator("h1")).toContainText("ಸಣ್ಣ ಹೆಜ್ಜೆಗಳು");
  await page.reload();
  await expect(page.getByTestId("language-select")).toHaveValue("kn");
  await expect(page.locator("h1")).toContainText("ಸಣ್ಣ ಹೆಜ್ಜೆಗಳು");
  await page.goto("/track/CP-2026-0931");
  await expect(page.getByTestId("language-select")).toHaveValue("kn");
  await expect(page.locator(".detail-status-strip")).toContainText(
    "ಪರಿಹರಿಸಲಾಗಿದೆ",
  );
  await expect(page.locator(".resolution-evidence-grid img")).toHaveCount(2);
  await expect(page.locator(".demo-evidence-label")).toContainText(
    "ನೈಜ ನಾಗರಿಕ",
  );
  await page.screenshot({
    path: "test-results/kannada-resolved-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: "test-results/kannada-resolved-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("/map");
  await page.locator(".filters select").first().selectOption("Water Leakage");
  await expect(page.locator(".map-list-item")).toHaveCount(7);
  await page.goto("/report");
  await expect(
    page.getByRole("heading", { name: "ಏನು ಸರಿಪಡಿಸಬೇಕು?" }),
  ).toBeVisible();
  await page.getByTestId("language-select").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "What needs fixing?" }),
  ).toBeVisible();
});

test("a citizen can complete the report flow in Kannada", async ({ page }) => {
  await page.route("**/api/analyze", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        category: "Pothole",
        confidence: 0.92,
        summary: "Pothole beside the school needs repair.",
        source: "local",
      }),
    }),
  );
  await page.goto("/report");
  await page.getByTestId("language-select").selectOption("kn");
  await page
    .locator("#description")
    .fill(
      "Large pothole outside the school. Cars are swerving and it is dangerous for students.",
    );
  await page.getByRole("button", { name: "ಸ್ಥಳಕ್ಕೆ ಮುಂದುವರಿಸಿ" }).click();
  await expect(
    page.getByRole("heading", { name: "ಸಮಸ್ಯೆ ಎಲ್ಲಿದೆ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ವರದಿ ವಿಶ್ಲೇಷಿಸಿ" }).click();
  await expect(page.locator(".duplicate-alert")).toContainText("ನಾಗರಿಕರು", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "ನನ್ನ ವರದಿಯನ್ನು ಈ ಪ್ರಕರಣಕ್ಕೆ ಸೇರಿಸಿ" })
    .click();
  await expect(
    page.getByRole("heading", { name: "ಒಂದೇ ಪ್ರಕರಣ. ಬಲವಾದ ಧ್ವನಿ." }),
  ).toBeVisible();
});

test("official contact is visible on cases and the old intake route redirects", async ({
  page,
}) => {
  await page.goto("/authority/online-leads");
  await expect(page).toHaveURL(/\/authority\/issues$/);
  await expect(page.getByRole("link", { name: "Add online lead" })).toHaveCount(
    0,
  );
  await expect(page.locator("tbody")).toContainText(
    "Greater Bengaluru Authority",
  );
  await expect(page.locator("tbody")).toContainText("Call 1533");
  await page.goto("/track/CP-2026-0892");
  await expect(
    page.getByRole("heading", { name: "Responsible public office" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 1533" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Official complaint site" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find the current corporation and ward" }),
  ).toBeVisible();
  await page.goto("/track/CP-2026-0949");
  await expect(
    page.getByText("Electronic City Traffic Police Station", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Call 9480801832" }),
  ).toBeVisible();
  await page.goto("/track/CP-2026-0892");
  await page.screenshot({ path: "test-results/official-contact-desktop.png" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "test-results/official-contact-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("judge workflow merges one case, persists authority changes, and resolves it", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/authority");
  await expect(
    page.getByRole("heading", { name: "A pulse on your city." }),
  ).toBeVisible();
  await expect(page.locator(".vector-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "test-results/authority-desktop.png",
    fullPage: true,
  });
  await page.route("**/api/analyze", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        category: "Pothole",
        confidence: 0.92,
        summary: "School-zone pothole needs repair.",
        source: "local",
      }),
    }),
  );
  await page.goto("/report");
  await page
    .getByRole("button", { name: "Use demo scenario", exact: true })
    .click();
  await expect(page.locator(".image-preview img")).toBeVisible();
  await page.getByRole("button", { name: "Continue to location" }).click();
  await page
    .getByRole("button", { name: "Analyse report", exact: true })
    .click();
  await expect(
    page.getByText("6 citizens have already reported this.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/duplicate-analysis.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add my report to this case" })
    .click();
  await expect(
    page.getByText("7 citizen reports · one actionable case"),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("civicpulse-demo-v1")!),
  );
  expect(saved.issues).toHaveLength(48);
  expect(saved.reports).toHaveLength(1);
  await page.getByRole("link", { name: "Track this complaint" }).click();
  await expect(
    page.getByRole("heading", { name: "Large pothole near school entrance" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I’m affected too", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "You’ve confirmed" }),
  ).toBeDisabled();
  const tracker = await context.newPage();
  await tracker.goto("/track/CP-2026-0892");
  await page.getByRole("link", { name: "Open authority view" }).click();
  await page
    .getByRole("combobox", { name: "Case status", exact: true })
    .click();
  await page.getByRole("option", { name: "In Progress", exact: true }).click();
  await page
    .getByLabel("Public progress update")
    .fill("Crew dispatched. Repairs are underway.");
  await page.getByRole("button", { name: "Save case update" }).click();
  await expect(tracker.locator(".detail-status-strip")).toContainText(
    "In Progress",
  );
  await expect(tracker.locator(".timeline")).toContainText(
    "Crew dispatched. Repairs are underway.",
  );
  await page
    .getByLabel("Internal note", { exact: true })
    .fill("Coordinate school gate access.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.locator(".internal-note")).toContainText(
    "Coordinate school gate access.",
  );
  await page
    .getByRole("combobox", { name: "Case status", exact: true })
    .click();
  await page.getByRole("option", { name: "Resolved", exact: true }).click();
  await page
    .getByLabel("Resolution note")
    .fill("Pothole repaired and levelled.");
  await page
    .getByLabel("Upload authority after-photo")
    .setInputFiles("public/demo-pothole.png");
  await expect(
    page.locator(".authority-controls .image-preview img"),
  ).toHaveAttribute("src", /^data:image\/jpeg/);
  await page.getByRole("button", { name: "Save case update" }).click();
  await page.getByRole("button", { name: "Submit after-photo" }).click();
  await expect(tracker.locator(".detail-status-strip")).toContainText(
    "In Progress",
  );
  await expect(tracker.locator(".resolution-card")).toContainText(
    "Waiting for citizen photo",
  );
  await tracker
    .getByLabel("Upload citizen confirmation photo")
    .setInputFiles("public/demo-pothole.png");
  await tracker
    .getByLabel("What was fixed?")
    .fill("The pothole is filled and the road is level.");
  await tracker.getByRole("button", { name: "Confirm fix with photo" }).click();
  await expect(tracker.locator(".detail-status-strip")).toContainText(
    "Resolved",
  );
  await tracker.reload();
  await expect(tracker.locator(".resolution-card")).toContainText(
    "Pothole repaired and levelled.",
  );
  await expect(tracker.locator(".resolution-evidence-grid img")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/resolved-case.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("map filters, search, and a new nonduplicate report work", async ({
  page,
}) => {
  await page.goto("/map");
  await page
    .getByRole("combobox", { name: "Category filter", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Water Leakage", exact: true })
    .click();
  await expect(page.locator(".map-list-item")).toHaveCount(7);
  await page.getByRole("button", { name: "Heatmap", exact: true }).click();
  await expect(page.locator(".vector-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Heatmap", exact: true }),
  ).toHaveClass(/selected/);
  await expect(page.locator(".signal-marker")).toHaveCount(0);
  await page
    .getByLabel("Search issues", { exact: true })
    .fill("no-such-case-xyz");
  await expect(
    page.getByRole("heading", { name: "No issues match these filters." }),
  ).toBeVisible();
  await page.goto("/report");
  await page
    .getByLabel("Describe the issue")
    .fill("Water leak from a burst pipe outside a residential building.");
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/demo-pothole.png");
  await expect(page.locator(".image-preview img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.getByRole("button", { name: "Continue to location" }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("13.12");
  await page.getByLabel("Longitude", { exact: true }).fill("77.72");
  await page
    .getByLabel("Address or nearby landmark")
    .fill("North Bengaluru, residential lane");
  await page
    .getByRole("button", { name: "Analyse report", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Register complaint", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Report received. Action starts here." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Track this complaint" }).click();
  await expect(page.locator(".case-facts")).toContainText("Water Supply");
  await page.goto("/authority/issues");
  await page
    .getByLabel("Search issues", { exact: true })
    .fill("North Bengaluru");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("responsive pages fit 375, 768, 1024 and 1440 pixel screens", async ({
  page,
}) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/authority",
      "/report",
      "/map",
      "/citizen",
      "/track",
      "/authority/issues",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForTimeout(150);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: window.innerWidth,
      }));
      expect(dimensions.scroll, `${route} at ${width}px`).toBeLessThanOrEqual(
        dimensions.width + 1,
      );
    }
    if (width === 375) {
      await page.goto("/report");
      await page.screenshot({
        path: "test-results/report-mobile.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page.getByRole("link", { name: "City map", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Close navigation", exact: true })
        .first()
        .click();
    }
  }
});
