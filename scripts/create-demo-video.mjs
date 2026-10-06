// Rebuild the 60-second, 1280x720 product tour from an isolated local demo session.
// Requires the local preview, Chrome, and Playwright's bundled FFmpeg.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

const base = process.env.DEMO_BASE_URL || "http://127.0.0.1:3000";
const output = path.resolve("public/demo");
const work = path.resolve(".video-work");
await mkdir(output, { recursive: true });
await mkdir(work, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
    reducedMotion: "reduce",
  });
  const shots = {};
  const capture = async (name, locator) => {
    await page.waitForTimeout(500);
    const data = await (locator || page).screenshot({ animations: "disabled" });
    await writeFile(path.join(work, `${name}.png`), data);
    shots[name] = `data:image/png;base64,${data.toString("base64")}`;
  };
  if (!process.argv.includes("--render-only")) {
    await page.goto(base);
    await page.locator("h1").waitFor();
    await capture("home");
    await page.goto(`${base}/citizen`);
    await page.locator('.vector-map[data-map-ready="true"]').waitFor();
    await page.waitForTimeout(1800);
    await capture("map", page.locator(".intelligence-stage"));
    await page.route("**/api/analyze", (route) =>
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
    await page.goto(`${base}/report`);
    await page
      .getByRole("button", { name: "Use demo scenario", exact: true })
      .click();
    await page.locator(".image-preview img").waitFor();
    await capture("report");
    await page.getByRole("button", { name: "Continue to location" }).click();
    await page
      .locator(".leaflet-tile-loaded")
      .first()
      .waitFor({ timeout: 15000 });
    await capture("location", page.locator(".form-section"));
    await page
      .getByRole("button", { name: "Analyse report", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add my report to this case" })
      .waitFor();
    await capture("review", page.locator(".form-section"));
    await page
      .getByRole("button", { name: "Add my report to this case" })
      .click();
    await page.getByRole("link", { name: "Track this complaint" }).click();
    await page.getByRole("link", { name: "Open authority view" }).click();
    await page
      .getByRole("combobox", { name: "Case status", exact: true })
      .click();
    await page
      .getByRole("option", { name: "In Progress", exact: true })
      .click();
    await page
      .getByLabel("Public progress update")
      .fill("Crew dispatched. Repairs are underway.");
    await page.locator(".authority-controls").scrollIntoViewIfNeeded();
    await capture("authority");
    await page.getByRole("button", { name: "Save case update" }).click();
    await page.goto(`${base}/track/CP-2026-0892`);
    await page.locator(".detail-status-strip").waitFor();
    await capture("track");
    console.log("Captured seven real product screens.");
  } else {
    for (const name of [
      "home",
      "map",
      "report",
      "location",
      "review",
      "authority",
      "track",
    ])
      shots[name] =
        `data:image/png;base64,${(await readFile(path.join(work, `${name}.png`))).toString("base64")}`;
  }

  const scenes = [
    {
      at: 0,
      duration: 5,
      shot: "home",
      tag: "YOUR CITY. YOUR SIGNAL.",
      title: ["Small actions.", "Real change."],
      body: "A better neighbourhood starts with one report. Here is how it works.",
      accent: "#f5f5f5",
      action: "CIVICPULSE IN 60 SECONDS",
    },
    {
      at: 5,
      duration: 8,
      shot: "map",
      tag: "01 / EXPLORE",
      title: ["See your city", "in full view."],
      body: "Open the city map. Explore nearby reports and the issues that need attention first.",
      accent: "#7dd3fc",
      action:
        "RED · CRITICAL    ORANGE · HIGH    YELLOW · MEDIUM    GREEN · LOW",
    },
    {
      at: 13,
      duration: 8,
      shot: "report",
      tag: "02 / REPORT",
      title: ["Spot it.", "Share it."],
      body: "Choose Report an issue. Describe the problem and add a photo so the team can understand it.",
      accent: "#c4b5fd",
      action: "TIP: USE DEMO SCENARIO TO TRY THE SCHOOL-ZONE POTHOLE",
    },
    {
      at: 21,
      duration: 8,
      shot: "location",
      tag: "03 / LOCATE",
      title: ["Put the problem", "on the map."],
      body: "Choose a neighbourhood, then tap the map or move the pin to mark the right location.",
      accent: "#7dd3fc",
      action: "A PRECISE LOCATION HELPS THE RIGHT TEAM FIND THE PROBLEM",
    },
    {
      at: 29,
      duration: 8,
      shot: "review",
      tag: "04 / REVIEW & SUBMIT",
      title: ["One problem.", "One stronger case."],
      body: "Review the category and nearby matches. Add your voice to an existing case, or register a new one.",
      accent: "#fbbf24",
      action: "SAVE YOUR CASE NUMBER TO FOLLOW THE NEXT STEPS",
    },
    {
      at: 37,
      duration: 8,
      shot: "authority",
      tag: "05 / CITY TEAMS",
      title: ["The right team.", "A clear next step."],
      body: "In the authority workspace, teams assign departments, update status, and share progress notes.",
      accent: "#c4b5fd",
      action: "DEMO AUTHORITY VIEW · CREW DISPATCHED · IN PROGRESS",
    },
    {
      at: 45,
      duration: 10,
      shot: "track",
      tag: "06 / TRACK THE FIX",
      title: ["Every step,", "in the open."],
      body: "Enter your case number in Track a report. See updates and confirm the completed fix with a photo.",
      accent: "#34d399",
      action: "REPORT → ASSIGNED → IN PROGRESS → RESOLVED",
    },
    {
      at: 55,
      duration: 5,
      shot: "home",
      tag: "THE NEXT CHAPTER IS YOURS.",
      title: ["Your city.", "Your move."],
      body: "Explore the map. Send your first signal. Be part of the difference.",
      accent: "#f5f5f5",
      action: "TRY IT NOW → REPORT AN ISSUE",
    },
  ];
  await writeFile(
    path.join(output, "civicpulse-tour.vtt"),
    "WEBVTT\n\n" +
      scenes
        .map((scene) => {
          const stamp = (n) =>
            `00:${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}.000`;
          return `${stamp(scene.at)} --> ${stamp(scene.at + scene.duration)}\n${scene.title.join(" ")} ${scene.body}\n`;
        })
        .join("\n"),
  );
  const render = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await render.setContent(
    '<html><body style="margin:0;background:#080808"><canvas width="1280" height="720"></canvas></body></html>',
  );
  await render.evaluate(
    async ({ shots, scenes }) => {
      const canvas = document.querySelector("canvas"),
        ctx = canvas.getContext("2d");
      const images = {};
      await Promise.all(
        Object.entries(shots).map(
          ([name, src]) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                images[name] = img;
                resolve();
              };
              img.src = src;
            }),
        ),
      );
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
      const box = (x, y, w, h, r = 12) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      };
      const text = (str, x, y, size = 16, color = "#fff", weight = 400) => {
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px Arial`;
        ctx.fillText(str, x, y);
      };
      const wrap = (str, x, y, w, size = 17, color = "#aeb5bd") => {
        let line = "",
          dy = 0;
        ctx.font = `400 ${size}px Arial`;
        for (const word of str.split(" ")) {
          if (ctx.measureText(line + word).width > w && line) {
            text(line, x, y + dy, size, color);
            dy += 28;
            line = "";
          }
          line += word + " ";
        }
        text(line, x, y + dy, size, color);
      };
      function scene(s, t, alpha = 1, shift = 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(shift, 0);
        const enter = ease(t / 1.05),
          drift = clamp(t / s.duration);
        ctx.save();
        ctx.translate(0, 18 * (1 - enter));
        ctx.globalAlpha *= enter;
        text(s.tag, 48, 173, 11, s.accent, 600);
        s.title.forEach((line, i) => {
          ctx.font = "500 42px Arial";
          const size = Math.min(42, (308 / ctx.measureText(line).width) * 42);
          text(line, 46, 237 + i * 52, size, i === 0 ? "#fff" : s.accent, 500);
        });
        wrap(s.body, 48, 373, 308, 17);
        ctx.strokeStyle = s.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(48, 502);
        ctx.lineTo(112 + 70 * enter, 502);
        ctx.stroke();
        text(
          "A SMALL ACTION. A VISIBLE DIFFERENCE.",
          48,
          531,
          8,
          "#7d8794",
          500,
        );
        ctx.restore();
        // Rounded browser frame with a slow camera move through the actual screen.
        const x = 391,
          y = 125,
          w = 842,
          h = 456;
        ctx.save();
        ctx.translate(28 * (1 - enter), 10 * (1 - enter));
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 40;
        box(x, y, w, h + 32, 14);
        ctx.fillStyle = "#151a20";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff22";
        ctx.stroke();
        ["#f87171", "#fbbf24", "#34d399"].forEach((c, i) => {
          ctx.beginPath();
          ctx.arc(x + 17 + i * 14, y + 17, 3, 0, 7);
          ctx.fillStyle = c;
          ctx.fill();
        });
        text(
          "CIVICPULSE / " + (s.shot === "home" ? "WELCOME" : s.tag.slice(5)),
          x + 78,
          y + 21,
          8,
          "#93a0ad",
          500,
        );
        box(x + 1, y + 33, w - 2, h - 2, 0);
        ctx.clip();
        ctx.fillStyle = "#080808";
        ctx.fillRect(x, y + 33, w, h);
        const img = images[s.shot];
        const fit = Math.min(w / img.width, h / img.height);
        const zoom = 1.03 + drift * 0.055;
        const dw = img.width * fit * zoom,
          dh = img.height * fit * zoom;
        ctx.drawImage(
          img,
          x + (w - dw) / 2,
          y + 33 + (h - dh) / 2 - drift * 7,
          dw,
          dh,
        );
        // A restrained cursor trail highlights movement without covering the UI.
        if (t > 1.4 && t < s.duration - 0.5 && s.shot !== "home") {
          const move = ease((t - 1.4) / 2.4),
            cx = x + w * (0.77 - 0.25 * move),
            cy = y + 90 + h * (0.53 - 0.12 * move);
          const ring = clamp((t - 3.5) / 0.75);
          if (t > 3.5 && t < 4.25) {
            ctx.globalAlpha *= 1 - ring;
            ctx.strokeStyle = s.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 8 + ring * 24, 0, 7);
            ctx.stroke();
            ctx.globalAlpha = alpha;
          }
          ctx.save();
          ctx.translate(cx, cy);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 21);
          ctx.lineTo(6, 15);
          ctx.lineTo(11, 25);
          ctx.lineTo(15, 23);
          ctx.lineTo(10, 13);
          ctx.lineTo(18, 13);
          ctx.closePath();
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        text(s.action, 391, 647, 10, s.accent, 500);
        ctx.restore();
      }
      window.drawFrame = (time) => {
        ctx.fillStyle = "#080b10";
        ctx.fillRect(0, 0, 1280, 720);
        const glow = ctx.createRadialGradient(940, 330, 0, 940, 330, 670);
        glow.addColorStop(0, "#182632");
        glow.addColorStop(1, "#080b10");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 1280, 720);
        ctx.strokeStyle = "#ffffff04";
        ctx.lineWidth = 1;
        for (let x = 0; x < 1280; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 90);
          ctx.lineTo(x, 690);
          ctx.stroke();
        }
        text("CIVICPULSE", 48, 53, 19, "#fff", 700);
        text("THE ONE-MINUTE WALKTHROUGH", 218, 52, 9, "#939eaa", 500);
        text("BENGALURU · INTERACTIVE DEMO", 987, 52, 9, "#939eaa", 500);
        ctx.strokeStyle = "#ffffff15";
        ctx.beginPath();
        ctx.moveTo(48, 78);
        ctx.lineTo(1232, 78);
        ctx.stroke();
        const index = Math.max(
          0,
          scenes.findLastIndex((s) => time >= s.at),
        );
        const s = scenes[index],
          local = time - s.at;
        if (index > 0 && local < 0.65) {
          const blend = ease(local / 0.65);
          scene(
            scenes[index - 1],
            scenes[index - 1].duration,
            1 - blend,
            -30 * blend,
          );
          scene(s, local, blend, 30 * (1 - blend));
        } else scene(s, local);
        let offset = 48;
        for (const ch of scenes) {
          const width = (1184 * ch.duration) / 60 - 5;
          ctx.fillStyle = "#ffffff13";
          ctx.fillRect(offset, 683, width, 2);
          ctx.fillStyle = ch.accent;
          ctx.fillRect(
            offset,
            683,
            width * clamp((time - ch.at) / ch.duration),
            2,
          );
          offset += width + 5;
        }
        text("DEMO ONLY · REPORTS STAY IN YOUR BROWSER", 48, 708, 8, "#7d8794");
        text(
          `${String(Math.floor(time)).padStart(2, "0")} / 60 SEC`,
          1155,
          708,
          8,
          "#aeb5bd",
        );
        return canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
      };
    },
    { shots, scenes },
  );

  const poster = await render.evaluate(() => {
    window.drawFrame(7);
    return document
      .querySelector("canvas")
      .toDataURL("image/jpeg", 0.9)
      .split(",")[1];
  });
  await writeFile(
    path.join(output, "civicpulse-tour-poster.jpg"),
    Buffer.from(poster, "base64"),
  );
  const ffmpeg =
    process.env.FFMPEG_PATH ||
    path.join(
      process.env.LOCALAPPDATA,
      "ms-playwright/ffmpeg-1011/ffmpeg-win64.exe",
    );
  const encoder = spawn(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-c:v",
      "mjpeg",
      "-framerate",
      "30",
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libvpx",
      "-b:v",
      "2300k",
      "-crf",
      "12",
      "-deadline",
      "realtime",
      "-cpu-used",
      "4",
      "-threads",
      "4",
      "-pix_fmt",
      "yuv420p",
      path.join(work, "civicpulse-tour.webm"),
    ],
    { stdio: ["pipe", "ignore", "pipe"], windowsHide: true },
  );
  let errors = "";
  encoder.stderr.on("data", (data) => (errors += data));
  const ended = once(encoder, "close");
  for (let frame = 0; frame < 1800; frame++) {
    const png = await render.evaluate((t) => window.drawFrame(t), frame / 30);
    await new Promise((resolve, reject) =>
      encoder.stdin.write(Buffer.from(png, "base64"), (error) =>
        error ? reject(new Error(errors || error.message)) : resolve(),
      ),
    );
    if (frame % 300 === 0) console.log(`Rendered ${frame / 30}/60 seconds`);
  }
  encoder.stdin.end();
  const [code] = await ended;
  if (code !== 0) throw new Error(errors);
  await rename(
    path.join(work, "civicpulse-tour.webm"),
    path.join(output, "civicpulse-tour.webm"),
  );
  console.log(`Created 60-second tour: ${output}`);
} finally {
  await browser.close();
}
