# Current redesign verification — 6 October 2026

## Public release — 6 October 2026

- Public source: [GitHub repository](https://github.com/praveen8723/CivicPulse), including the MIT license, setup guide, and screenshots.
- Live deployment: [CivicPulse on Netlify](https://civicpulse-praveen.netlify.app). The Netlify Next.js runtime packaged the server route and published the production site.
- Final local checks: TypeScript and ESLint passed; all 13 domain tests passed; the production Next.js build completed.
- The live homepage, report page, authority page, analysis route, and demo video returned successful responses. The analysis route classified a pothole report using its local keyword fallback on Netlify.
- The current site was deployed from the Netlify CLI. Git-triggered continuous deployment has not been configured.

## AI and official contact follow-up — 6 October 2026

- Verified `POST /api/analyze` returned `source: "ollama"` and `Waterlogging` from the installed `llama3.2:latest` model on the local Ollama server. Cold model startup can take tens of seconds; keyword analysis is the fallback.
- The manual online-lead intake was removed on request. Its old URL redirects to issue management; existing locally saved cases remain intact.
- The browser test checks the prominent official contact section, GBA 1533 phone action, official complaint link and ward lookup.
- Final checks: TypeScript, lint, 7 domain tests, 4 Chrome browser tests and production build passed. Desktop and 375 px contact screenshots were visually inspected; mobile had no page-level horizontal overflow.
- Earlier baseline notes below describe the original demo and remain as historical verification.

The dark Bengaluru operations UI supersedes the earlier light layout. The globe has been removed in favour of a city neighbourhood tour and a planar hotspots view.

- Production build, TypeScript and lint passed. The existing seven domain tests passed during the redesign.
- Browser checks at 390, 768 and 1440 pixels covered all seven main routes; none had horizontal page overflow.
- Verified the six-stop city tour starts on CP-2026-0947, advances automatically, and synchronizes the selected case panel. Recenter pauses the tour. Hotspots activates the heatmap. Mobile tour controls and selected case layout were visually inspected.
- Verified the report demo still classifies the school pothole and finds six existing reports on CP-2026-0892.
- Browser automation selectors were updated for MapLibre and the new navigation. The full Playwright suite below is the earlier baseline, not a rerun against the new UI. Current interactive checks used the in-app browser.
- Reduced-motion handling is implemented in counters, map cameras, tour timing and CSS; OS preference switching was not exercised through the browser tool.

Current captures: `docs/screenshots/bengaluru-workspace.png` and `docs/screenshots/bengaluru-mobile.png`.

## Earlier implementation baseline


Verified locally on 5 October 2026 using Node.js 22.18, Next.js 16.3.8 and Chrome.

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | Passed |
| ESLint (`npm run lint`) | Passed, no warnings |
| Domain tests (`npm test`) | 7 passed |
| Browser journeys (`npm run test:e2e`) | 3 passed |
| Production build (`npm run build`) | Passed; all application routes generated |
| Production dependency audit (`npm audit --omit=dev`) | No known vulnerabilities reported |

The browser journeys verify the six-to-seven report merge into CP-2026-0892, unchanged master-case count, a unique report receipt, community confirmation, authority status controls, a public progress update, internal notes, cross-tab tracker synchronisation, confirmed resolution, reload persistence, photo upload/resizing, creation of a new issue, department routing, management search, category filtering and map density rendering.

Layout checks visit home, authority, report, map, citizen, tracker and issue management at 375, 768, 1024 and 1440 pixels. No page-level horizontal overflow was detected. Wide tables scroll within their containers. The full judge workflow produced no uncaught browser page errors. Final map imagery was visually inspected after loading OpenStreetMap tiles.

Screenshots are in `docs/screenshots/`. The photo in the sample report is AI-generated illustrative imagery.

## Boundaries of this verification

- Authority access is simulated and storage is browser-local. No production backend, government routing or messaging service was tested.
- The optional external analysis provider was not configured. The local Ollama path and deterministic fallback were tested in the follow-up above.
- Speech and GPS depend on browser/device support and permission. Their typed/manual alternatives remain available.
- Native WebMCP support was unavailable; optional browser agent integration remains unverified.
- The full development dependency audit reports one `braces` stack-exhaustion advisory propagated through five ESLint-related packages. The production dependency set is unaffected. npm's suggested remediation downgrades the Next.js lint configuration by a major version; it was not applied. Keep lint tooling updated and avoid processing untrusted glob patterns.
- This is functional and responsive verification, not a production security review or formal accessibility certification.

## Map and readability follow-up — 6 October 2026

- Home map is inert and ignores pointer input, with no map control buttons or DOM markers. Decorative circles render in the map itself to avoid marker rounding/pulsing during rotation; its separate pause control remains available.
- Building and heatmap layers now sit below map labels. Labels have larger zoom-scaled type, brighter colours and stronger halos; place names stay aligned to the screen during tilted views.
- Marker and hotspot previews support pointer hover and keyboard focus. Heatmap previews show nearby case and report totals; tapping the heatmap also opens a preview.
- Removed City/Overview perspective controls from the city-map route. Markers/Heatmap remains.
- Increased small UI captions and footer text. Rechecked home, citizen and map at 390, 768 and 1440 pixels with no page overflow. Verified both tooltip variants and the decorative home-map DOM. Production build, TypeScript and final lint passed.

