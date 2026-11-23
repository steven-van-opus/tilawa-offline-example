# Tilawa offline example

An original Creators Toolbox example of a small browser interface around [Tilawa](https://github.com/yazinsai/tilawa). It follows a declared passage, displays the current word coordinate and collects confirmed memorization flags for review. This is an independent example, not an official Tilawa app.

The example uses Al-Fatihah, surah 1, ayahs 1 to 7. It does not copy or render Quran text. It is not a tajweed checker, pronunciation grader, certification tool or substitute for a teacher.

## Run locally

Use Node 20.19+ or 22.12+ for Vite 7. From this folder:

```sh
npm install
npm run dev
```

Open the localhost URL, choose **Start a take**, allow the microphone and wait for setup. The example pins `@tilawa/core` 1.0.0-rc.1 (the preview API) and `onnxruntime-web` 1.30.0, which Tilawa's official asset host supports. Do not replace this with the older `latest` package API without checking the [migration guide](https://github.com/yazinsai/tilawa/blob/main/docs/migration-0.x-to-1.0.md).

The app explicitly chooses the lite model (about 25 MB) for a small example. It is less accurate than the full model. The reference adds about 4.7 MB and runtime files add another first-run download. No weights, reference data or recordings are committed here.

## What the example does

1. Calls `prepareMicrophone()` during the click, before waiting for downloads, to support iOS audio gesture requirements.
2. Loads one engine and reuses it across takes.
3. Declares a fixed passage with `startMemorization`.
4. Updates the coordinate display only when tracking is locked.
5. Displays confirmed `checker` events, keyed by their stable IDs. Uncertain or self-corrected events are removed from the review list.
6. Stops microphone tracks and lets final checks finish before disposing a take. The model stays loaded for another take and is released when leaving the page.

All recitation audio stays on the device. No audio upload or analytics code is included. The first setup fetches the model, reference and ONNX runtime from `https://tilawa.dev/v1/`. Keeping this page open after setup allows subsequent takes without a network connection. The SDK caches its model and reference; browser caches can be evicted.

A production build registers the original service worker in `public/sw.js`. It caches the app shell and its built assets, then stores public Tilawa ONNX runtime files as they load. The SDK separately caches the model and reference. Use `npm run build` and `npm run preview`, start a take successfully while online, stop it, switch offline, then reload and start another take to verify preparation on your target browser. Do not rely on Vite development mode for offline reloads.

The first successful setup must finish while the page is controlled by its service worker. The app waits for that control before starting its model download. A first-ever visit without a connection cannot work. Browser storage eviction can remove cached files. The service worker handles GET requests only and adds no audio upload path. For your own asset host, mirror Tilawa's documented layout and set `assetBase`; self-hosting is optional, not required by the SDK. See the [official offline guide](https://github.com/yazinsai/tilawa/blob/main/docs/self-hosting.md). Runtime cache behavior and live recognition have not been tested here; verify the whole flow in browser network tools before promising offline reloads.

## Review carefully

The preview can miss mistakes and produce false warnings. It checks wrong, omitted and added words and skipped passages. It does not check tajweed or pronunciation. Hafs is the only supported reference. Children's voices and fast hadr are outside the supported evaluation, and real phone/browser performance is not yet established in the [support matrix](https://github.com/yazinsai/tilawa/blob/main/docs/support.md). Treat each flag as a prompt for a person to review.

A useful manual check: warm the app, stop the first take, switch the browser offline with the page still open, start another take and verify that no audio request is sent. Then restore the connection and deny microphone permission to check the error message. Live recognition and performance have not been tested as part of creating this example.

## Credits and licenses

Example application code is MIT licensed; see LICENSE. It was independently written around the documented public API and contains no copied upstream implementation.

Tilawa is by yazinsai: [project](https://github.com/yazinsai/tilawa), [website](https://tilawa.dev), [quickstart](https://github.com/yazinsai/tilawa/blob/main/docs/quickstart.md).

Tilawa 1.x SDK code is MIT licensed. Its `spliced-clean` and `spliced-clean-lite` model weights are CC BY 4.0 and require attribution when redistributed. Data and text have their own attribution terms; consult upstream [NOTICE.md](https://github.com/yazinsai/tilawa/blob/main/NOTICE.md) and the [model card](https://github.com/yazinsai/tilawa/blob/main/docs/model-card.md) before mirroring files. This example does not redistribute those assets. The old 0.x model license differs and does not apply to the 1.x weights.
