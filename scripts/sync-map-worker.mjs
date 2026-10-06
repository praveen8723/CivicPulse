import { copyFile, mkdir } from "node:fs/promises";
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await copyFile(
  new URL(
    "../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ),
  new URL("../public/maplibre-worker.mjs", import.meta.url),
);
await copyFile(
  new URL(
    "../node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs",
    import.meta.url,
  ),
  new URL("../public/maplibre-gl-shared.mjs", import.meta.url),
);
