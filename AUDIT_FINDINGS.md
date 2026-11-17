# CampusVision AI — Code Audit Findings

**Audit date:** 2026-11-17  
**Scope:** Current checkout at `f174c55` and the recent changes named in the request.  
**Phase 1 status:** Read-only review complete. No repository files other than this report have been changed.

## 1. Summary

The application builds and its three supplied backend scripts pass in an isolated copy of the repository. The sample selection flow, manual prompt override, SQL parameterization, public-file resolver, and explicit Demo labeling are in better shape than the older `AUDIT_REPORT.md` describes.

I found **2 High, 12 Medium, and 6 Low findings**. The two High findings are an exploitable SPA path traversal that returns repository files and an unauthenticated API exposed on all network interfaces by both startup scripts. Medium findings include unbounded upload reads, image normalization problems, unreachable cloud-provider controls, mismatched `auto` prompt profiles, controls that are not sent to some providers, repeat generation requests, stale sketch selection races, response type mismatches, misleading local conditioning previews, and unbounded asset retention.

The exact Stable Diffusion 1.5 CLIP token count could not be verified: neither `transformers` nor `tokenizers` is installed, and I did not add a tokenizer dependency. I measured the current prompt combinations using the code's word-count heuristic only; no conclusion that a particular prompt exceeds 77 CLIP tokens is claimed. I also could not run an actual ComfyUI generation, exercise the UI at 375/768/1280 px in a browser, or test optional cloud engines with credentials. Those limitations are detailed below.

### Severity counts

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 2 |
| Medium | 12 |
| Low | 6 |

## 2. Commands run and results

All installation, build, and backend test commands ran in an isolated local clone at `/private/tmp/campusvision-audit-20261117`, so generated test assets and the audit virtual environment did not touch this checkout. The isolated clone had no copied `.env` or SQLite database.

| Command | Result |
|---|---|
| `npm ci` (from `frontend/`) | **PASS**, exit 0; installed 138 packages from the lock file. |
| `npx tsc --noEmit` (from `frontend/`) | **PASS**, exit 0; no diagnostics. |
| `npm run build` (from `frontend/`) | **PASS**, exit 0; Vite built 1,601 modules in about 828 ms. Bundle: JS 285.52 kB (80.00 kB gzip), CSS 43.03 kB (7.45 kB gzip). No build warnings. |
| `python -m py_compile backend/*.py backend/services/*.py` | **NOT RUN successfully**: this shell has no `python` executable (`zsh: command not found: python`, exit 127). |
| `python3 -m py_compile backend/*.py backend/services/*.py` | **PASS**, exit 0; no output. |
| `python3 backend/test_suite.py` using system Python | **FAIL before tests**, because FastAPI is not installed in system Python. |
| `./.audit-venv/bin/python backend/test_suite.py` | **PASS**, all 9 checks. The test's generation success path explicitly selected Demo; it did not call ComfyUI. Emits a Starlette deprecation warning about using `httpx` with `starlette.testclient` and suggesting `httpx2`. |
| `./.audit-venv/bin/python backend/test_prompts_and_samples.py` | **PASS**, all 7 test functions/subtests. Same Starlette/httpx warning. |
| `env DEFAULT_PROVIDER=demo ./.audit-venv/bin/python backend/audit_test_runner.py` | **PASS**, all 8 scenarios executed in Demo mode. Same Starlette/httpx warning. |
| `git status --short && git ls-files \| grep -E 'node_modules|\\.env$|\\.db$|venv' \| head` (in this checkout) | **PASS**, exit 0; no output. No tracked node_modules, `.env`, `.db`, or venv paths. A local ignored `.env` exists; its contents were not read. `.env.example` is tracked and contains blank key placeholders. |

Additional direct check in the isolated clone: `GET /..%2f..%2fREADME.md` returned **HTTP 200** and the repository README (9,917 bytes), confirming the SPA path traversal described below.

The successful test runs establish that the in-process API tests pass under the isolated dependency set. They do **not** establish that the default ComfyUI graph runs on the user's Desktop build, that any cloud API works, that the startup shell scripts work end to end, or that browser layout/accessibility is correct.

## 3. Findings

Findings are ordered by severity. Line numbers refer to the audited checkout before Phase 2 changes.

| ID | Severity | Area | File:line | What is wrong | How to reproduce | Suggested fix | Confidence |
|---|---|---|---|---|---|---|---|
| SEC-01 | High | Static file serving | `backend/main.py:463-469` | The SPA catch-all joins a client-controlled `full_path` to `frontend/dist` and serves it without resolving and checking containment. Encoded traversal reaches files above `dist`. | With the built frontend present, request `GET /..%2f..%2fREADME.md`; the isolated TestClient returned the repository README with 200. The documented `start.sh` builds `dist`, enabling this route. | Resolve the candidate path and return 404 unless it is within the resolved `frontend/dist` directory. Add a regression test using encoded traversal. | Confirmed |
| SEC-02 | High | Security / network exposure | `backend/main.py:83-90`; `start.sh:25-29`; `run_dev.sh:20-24`; `backend/main.py:213-224,408-412,443-455` | The API has no authentication, CORS allows every origin, and both scripts bind Uvicorn to `0.0.0.0`. A reachable LAN client can change saved settings, clear cache, list/delete projects, or start a configured cloud generation. | Start either script on a networked machine and call its API from another host on that network. | For the documented local app, bind to loopback and restrict CORS to the local app origins. If remote/LAN use is required, add an authentication design before exposing these endpoints. | Confirmed |
| API-01 | Medium | Upload / resource limits | `backend/main.py:277-294`; `backend/services/image_processor.py:45-60,110-114` | The endpoint reads the entire uploaded file into RAM before the 20 MB check runs. The image is then decoded without an application pixel-count cap, so a compact, very large image can allocate much more memory than its file size. | POST a large multipart body or a highly compressed image with very large dimensions to `/api/preprocess-sketch`. | Read uploads in bounded chunks and stop at the configured byte limit; reject images above a documented pixel limit before OpenCV decoding. Use 413 for byte-limit failures. | Confirmed |
| IMG-01 | Medium | Image handling | `backend/services/image_processor.py:54-71`; `backend/services/comfyui_client.py:106-109` | Upload normalization drops alpha without compositing and saves a Pillow-converted image without applying EXIF orientation first. Transparent pixels can expose hidden black/colored RGB values, and rotated phone images can be stored in their sensor orientation. | Upload an RGBA PNG whose transparent pixels have black RGB values, or a JPEG with EXIF orientation 6; inspect the saved sketch and its edge map. | Apply `ImageOps.exif_transpose`, composite transparency over white, then save normalized RGB. Keep the pixel limit from API-01. | Confirmed |
| CFG-01 | Medium | Settings / provider access | `frontend/src/components/SettingsModal.tsx:165-181,211-255,257-293`; `backend/main.py:145-150` | The backend and `.env.example` support Replicate, Hugging Face, Fal, and auto, but the Settings dropdown exposes only ComfyUI and Demo. Replicate's input is hidden, Fal has no input field despite state/save handling, and there is no way to select any cloud engine in the UI. | Open Settings in a browser: only Local ComfyUI and Demo are selectable; the Replicate input has `hidden`, and no Fal input is rendered. | Restore the existing provider options and expose the matching password-masked credential fields, including Fal. Keep the local default. | Confirmed |
| CFG-02 | Medium | Auto-provider selection | `backend/main.py:171-205,238-250`; `backend/services/generator.py:194-214`; `frontend/src/utils/provider.ts:3-11` | `auto` is resolved differently in config, prompt preview, frontend capability checks, and generation. The preview resolver skips Fal; generator prefers Replicate, HF, Fal, then local ComfyUI. With only Fal configured, the preview uses the SD 1.5 profile while generation uses Fal's SDXL image-to-image profile. Config also labels `auto` with no cloud key as Demo although generation tries ComfyUI and errors if it is offline. `isLocalProvider` treats `auto` as cloud even when it resolves to ComfyUI. | Set `DEFAULT_PROVIDER=auto` and only a Fal key; compare `/api/build-prompt` profile/config with the generation branch. Or use auto with no cloud keys and ComfyUI running: config says Demo while generation chooses ComfyUI. | Share one deterministic auto-provider resolver across config, prompt building, and generation; accurately label auto as auto/local/cloud and use its effective provider for UI controls. | Confirmed |
| GEN-01 | Medium | Engine controls / metadata | `frontend/src/components/Studio/AdvancedControls.tsx:76-116,129-175,193-202`; `backend/services/comfyui_client.py:89-92`; `backend/services/generator.py:516-524,706-715,777-793,444-461` | Several enabled controls do not reach the chosen engine. Replicate and HF do not receive the selected resolution or denoising strength; Fal receives denoising as `strength` but not ControlNet strength, seed, or resolution; Demo ignores those diffusion values. Cloud `resolution` metadata stores the requested UI value rather than dimensions read from the saved output. For `auto`, the frontend currently assumes cloud. | Select each provider and change Resolution, Denoising, ControlNet, or seed; inspect the provider payload builders and returned image dimensions. | Pass supported values where the provider schema allows; disable or clearly mark unsupported controls per effective provider. Derive saved resolution/aspect metadata from the generated image. | Confirmed |
| GEN-02 | Medium | Concurrency / duplicate submission | `frontend/src/components/Studio/Studio.tsx:102-140,291-323`; `frontend/src/components/Results/ResultsView.tsx:114-119` | `isGenerating` disables only the main Generate button. `handleGenerate` has no synchronous re-entry guard; Retry/Demo buttons remain enabled, and ResultsView keeps its Regenerate button active while an existing result is shown. Fast repeated clicks can create duplicate requests/projects and, for cloud engines, duplicate charges. | Click Regenerate twice quickly, or trigger Retry and Generate before the first state update/render completes. | Add a ref-based in-flight guard in `handleGenerate`; disable all generation actions until the request settles and show the existing progress state during regeneration. | Confirmed |
| FE-01 | Medium | State / request races | `frontend/src/components/Studio/Studio.tsx:64-81,85-100`; `frontend/src/App.tsx:29-34,55-78` | Concurrent `loadSketchFromUrl` calls can complete out of order, leaving sketch A displayed with sketch B's style/prompt. Separately, the Navbar/Landing Studio navigation does not clear a previous `studioPreset`; after opening a saved project, returning to Overview and launching Studio can reopen the old project. | Select two sample sketches quickly; then separately open a saved project, go to Overview, and click Launch Studio. | Ignore stale sketch responses with a request counter/abort signal. Route all fresh Studio navigation through a helper that clears the preset and remounts; keep project reopen using `openStudioWith(project)`. | Confirmed |
| API-02 | Medium | API response contract | `backend/database.py:79-113,121-163`; `frontend/src/types/index.ts:24-30` | SQLite rows serialize `is_demo_mode`, `is_favorite`, and `cache_hit` as integer `0/1`, while the TypeScript project type declares booleans. The UI currently treats these as truthy values, but the API contract is not the declared type. | Call `/api/projects` after a generation and inspect the JSON types of those fields. | Convert those DB fields to Python booleans when producing project responses and assert JSON booleans in a test. | Confirmed |
| FE-02 | Medium | Conditioning preview / result comparison | `backend/services/image_processor.py:116-141,169-177`; `backend/services/comfyui_client.py:4-6,90-109`; `frontend/src/components/Studio/GenerationProgress.tsx:19-29`; `frontend/src/components/Comparison/ComparisonViewer.tsx:152-170,228-240` | Local ComfyUI generation uploads the original sketch, center-crops it to 768×512, and runs ComfyUI Canny. The visible OpenCV edge preview instead letterboxes to an aspect bucket and uses different thresholds. Progress says it sends the edge map, and Results labels the OpenCV overlay as structural verification, which can imply that this is the exact map used by local generation. The slider also renders its sketch at 100% width on first render (the ref is null), then changes width only after a slider event; there is no resize observer. | In local mode compare the visible edge preview to the ComfyUI workflow input; inspect the comparison slider before moving it and after resizing the window. | Label the local OpenCV view as an inspection preview and state that ComfyUI recomputes Canny from the original. Measure the slider container size and update on resize so the clipped sketch keeps its full width. | Confirmed |
| STORAGE-01 | Medium | Disk/cache lifecycle | `backend/services/image_processor.py:65-71,175-197`; `backend/services/generator.py:257-260`; `backend/database.py:165-172`; `backend/services/cache.py:145-163` | Uploads, edge/blueprint images, and generated renders accumulate. Deleting a project removes only its SQLite row. Cache pruning/clear removes index records but not files. This can consume disk over time; blindly deleting shared uploads or cached renders could break other history records. | Generate and delete multiple projects, then compare files in uploads/generated/cache before and after; `POST /api/cache/clear` clears only the index. | Decide an asset-retention policy first, then implement reference-aware cleanup/expiry. Do not delete shared files without checking remaining project/cache references. | Confirmed |
| PROMPT-01 | Medium | Prompt token budgeting | `backend/services/prompt_builder.py:147-150,282-303`; `backend/test_prompts_and_samples.py:23-29` | The SD 1.5 budget is a whitespace word count, not CLIP tokenization; all required prompt parts are appended even if the nominal budget is exceeded. The SDXL profile also appended an “8k” quality tag despite the app returning model-sized images. The code cannot substantiate that prompts fit a 75-token window. | Compile the full style × building × lighting matrix; compare the heuristic with a CLIP tokenizer and inspect the emitted quality wording. | Remove the unsupported “8k” tag (done in Phase 2). Describe the remaining word count as a heuristic; add tokenizer measurement only if a lightweight supported tokenizer can be used without a heavy runtime dependency. | Confirmed for the word-count heuristic and “8k” tag; tokenizer count unverified |
| PRIV-01 | Medium | Secrets at rest | `backend/main.py:213-224`; `backend/database.py:189-205` | API credentials entered in Settings are saved as plaintext values in the local SQLite settings table. They are not included in `/api/config` responses and were not found in application log statements, but another local account/process with DB read access can read them. | Enter a provider key, then inspect the local ignored SQLite database's `app_settings` table. The actual local DB was not opened during this audit. | For a single-user desktop app, document the local-file trust boundary; if stronger at-rest protection is required, choose an OS keychain integration rather than inventing encryption/key storage. | Confirmed by code; local DB contents not inspected |
| DOC-01 | Low | Product claims / sample provenance | `README.md:13,40-42,151,184`; `frontend/src/components/LandingPage.tsx:54-63,90-95,113-118`; `frontend/src/components/Footer.tsx:24-37,97-99`; `backend/services/gallery_data.py:27-28,111-128,340-363`; `frontend/src/components/Comparison/ComparisonViewer.tsx:152-180` | The README says photoreal outputs arrive “in seconds” and strictly preserve structure. Landing text claims high-resolution, board-ready output and says geometry is preserved without impossible structures. The Footer calls local/cloud inference “Sandboxed.” Sample render comments/API descriptions use “photorealistic” although `gallery_data.py` draws them procedurally. Demo results still receive “AI Render” badges. README line 184 does disclose that example renders are procedural. | Read the named copy; inspect `_render_photorealistic_visualization` and generate a Demo result. | Use qualified concept-render wording, state local runs can take minutes and conditioning is guidance rather than a guarantee, remove the sandbox claim, and label procedural samples/Demo results as illustrations. | Confirmed |
| DOC-02 | Low | Stale audit document | `AUDIT_REPORT.md:15-29,117-133,278-300` | The prior audit is presented as current and lists several findings that the present code no longer has (including sample-sync, prompt-profile, undefined default-negative, manual-override, and test-suite failures). It also refers to a missing `.env.example`, which is present, and claims the ComfyUI VAE input is invalid without checking the current node schema. | Compare the named findings with current source and run results in this report. | Mark the prior report historical/superseded and point readers to this report; do not rely on its remaining unverified findings. | Confirmed |
| DOC-03 | Low | Dependencies / setup reproducibility | `requirements.txt:1-10`; `frontend/package.json:8-25`; `.env.example:1-24`; `start.sh:11-23` | Python requirements specify minimum versions but have no lock file, so a fresh setup may resolve different transitive versions over time. The frontend is reproducible with `package-lock.json` and `npm ci`. `aiofiles`, `requests`, and frontend `clsx`/`tailwind-merge` appear unused by the current source. No dependency vulnerability scanner was run. | Compare a fresh pip resolution with a prior environment; search source for those dependency imports. | Decide the Python support matrix and whether to add a tested lock/constraints file; remove unused dependencies only after confirming no external scripts rely on them. | Confirmed for pinning/import usage; security status unverified |
| TEST-01 | Low | Test coverage | `backend/test_suite.py:18-19,83-120,142-147`; `backend/test_prompts_and_samples.py:47-73`; `backend/audit_test_runner.py:13-18,145-158` | The “end-to-end” suite uses an in-process TestClient; the successful generation branch is explicit Demo, not ComfyUI or a cloud service. The prompt/sample test processes six sketches but only generates one Demo image. The audit runner's eight scenarios also use Demo when run with the requested environment variable. No supplied test covers two clicks, real settings UI persistence, ComfyUI failure/cancellation, or actual cloud payloads. | Read the test paths or run the listed commands with `DEFAULT_PROVIDER=demo`; no external engine is contacted. | Keep the existing API tests, but describe their scope accurately and add focused regression tests for fixes. A real ComfyUI smoke test remains environment-dependent. | Confirmed |
| A11Y-01 | Low | Keyboard/accessibility | `frontend/src/components/Comparison/ComparisonViewer.tsx:138-150`; `frontend/src/components/Results/ResultsView.tsx:93-103`; `frontend/src/components/Comparison/FullscreenModal.tsx:42-73` | The split comparison is mouse/touch-driven and has no slider role, keyboard handlers, or value announcements. Several icon-only controls have `title` but no accessible name. Static review cannot establish contrast or screen-reader behavior. | Tab through the rendered app and try to operate the split slider with arrow keys and a screen reader. | Add an accessible slider role/value and arrow-key behavior; add `aria-label`s to icon-only buttons. Verify with keyboard and screen-reader checks. | Confirmed by source |
| CONC-01 | Low | Database/cache concurrency | `backend/database.py:174-187`; `backend/services/cache.py:89-117,119-163` | Favorite toggle is a SELECT-then-UPDATE sequence, and the shared JSON cache has no lock. Concurrent toggles/cache operations can race. No concurrent load test reproduced a failure; this is a risk rather than an observed data-loss incident. | Issue simultaneous favorite toggles for one project and concurrent cache writes/clear calls under multiple requests. | Use an atomic SQL toggle/update and protect cache index mutations/file writes if concurrent access is a supported deployment mode. | Suspected |

## 4. Over-claims and misleading text

- `README.md:13`: “in seconds” conflicts with the local progress copy estimating 1–3 minutes and the ComfyUI 900-second timeout.
- `README.md:13` and `LandingPage.tsx:54-63,90-95`: “strictly preserving” / “locks in” / “without hallucinating impossible structures” overstate ControlNet; it guides structure but cannot guarantee exact preservation. Hugging Face may fall back to text-only generation, and its response discloses that fallback.
- `LandingPage.tsx:113-118`: “Board & Donor Presentation Ready” and “high-resolution” are not guaranteed by the default 768×512 local SD 1.5 output.
- `Footer.tsx:97-99`: “Sandboxed Local & Cloud Inference” is a security claim not supported by an application sandbox in this repository.
- `gallery_data.py:27-28,111-128,340-363` and `/api/examples` description in `main.py:414-423`: the bundled example renders are procedural drawings, not model output. `README.md:184` correctly discloses this, but the source comments/descriptions do not.
- `ComparisonViewer.tsx:152-180`: the result is labeled “AI Render” even when `project.is_demo_mode` is true and the image came from the procedural engine.
- `GenerationProgress.tsx:19-29`: says the app sends the edge map to the engine; local ComfyUI receives the original sketch and computes its own Canny map.
- The SDXL prompt profile included “8k” although the generation endpoint does not request or return an 8K image; this tag was removed in Phase 2. The SD 1.5 prompt length remains a word-count heuristic, not a measured CLIP token limit.

## 5. Things that are fine

- The TypeScript check and Vite production build pass.
- All three supplied backend test scripts pass in the isolated clone with the commands and limitations recorded above.
- `resolve_public_file()` resolves only `/uploads`, `/samples`, and `/generated` paths and checks resolved containment; the traversal issue is in the separate SPA catch-all.
- Uploaded filenames use a generated UUID prefix, accepted extensions are allowlisted, Pillow verifies image data, and the size check exists (though it runs after the whole body is read).
- SQL values for project IDs, settings keys/values, search terms, filters, and deletes are parameterized.
- API keys are represented to the frontend as configured/not-configured flags; `/api/config` does not return their values. The inspected application logger calls do not log raw key variables.
- The manual compiled-prompt override is included in the frontend generation request, accepted by `GenerateRequest`, and preferred by the generator.
- Selecting any of the six sample cards updates the architecture fields and starts preprocessing its matching sketch. The previous audit's claim that this flow leaves all metadata stale is no longer true.
- Explicit Demo mode is marked in generation metadata and its status text says it is procedural. The README also correctly says the bundled example renders are procedural.
- Legacy `/backend/uploads`, `/backend/samples`, and `/backend/generated` mounts remain available for older history URLs.
- The ComfyUI workflow statically connects the original image through resize and Canny to `ControlNetApplyAdvanced`, then KSampler, decode, and save. The added `vae` input is optional in the current upstream ComfyUI node schema ([official source](https://github.com/Comfy-Org/ComfyUI/blob/master/nodes.py)); the installed ComfyUI Desktop version was not available to validate its runtime schema.
- The landing page currently has no hero slider image, and the separate Example Gallery section is not present. Both match the earlier requested removals; the Studio's six sketch presets remain reachable.
- `.env.example` exists and its default ComfyUI URL/checkpoint filenames match `backend/config.py`. `package-lock.json` is tracked; no runtime `node_modules`, `.db`, venv, or `.env` is tracked at this commit.

## 6. Recommended fix order

1. Fix SEC-01 path containment and SEC-02 local-only network exposure/CORS.
2. Bound uploads, set a pixel cap, normalize alpha/EXIF, and add tests for malformed/oversized/transparent/rotated images.
3. Restore provider selection/credential fields and centralize `auto` provider resolution; make prompt preview and engine labels agree with generation.
4. Make unsupported engine controls explicit and store actual output dimensions; correct Demo and local-conditioning labels.
5. Prevent duplicate submissions and stale sketch/preset responses; normalize API boolean fields.
6. Correct product copy and supersede the outdated `AUDIT_REPORT.md`.
7. Add keyboard support for comparison and decide retention/tokenizer/dependency policies listed under owner decisions after fixes.

## 7. Not verified / owner decisions

- No live ComfyUI Desktop was connected, so node validation on the user's exact installed build, missing-model errors, cancellation, and real output quality remain unverified.
- No cloud keys were used. Live Replicate/Hugging Face/Fal schemas, billing, model availability, and output sizes remain unverified.
- No browser or screen-reader pass was run. Responsive behavior at 375, 768, and 1280 px and contrast require visual/manual validation.
- CLIP tokenizer-based prompt counts were not run because no tokenizer package/model cache was available; adding a heavy ML dependency solely for prompt auditing conflicts with the stated constraint.
- Asset cleanup needs an owner retention choice (for example, keep generated renders for history, expire uploads after N days, and preserve files referenced by any project/cache record).
- The app is configured as a local desktop/web app. If LAN or remote access is required, an authentication/session design is needed before safely exposing mutating endpoints; loopback binding is the safe default.
- Python dependency pinning needs a declared Python/platform support target and a dependency security scan. No CVE status is claimed from the source-only audit.

## 8. Phase 2 status per finding

| ID | Status | Phase 2 outcome / remaining limitation |
|---|---|---|
| SEC-01 | **Fixed** | SPA paths are resolved and checked for containment under `frontend/dist`; encoded traversal regression returns 404. |
| SEC-02 | **Fixed** | Startup scripts bind to loopback and CORS only allows the app's local origins. Remote/LAN access still needs an authentication design. |
| API-01 | **Fixed** | Upload endpoint reads in bounded chunks and returns 413 over limit; image decoder rejects images above 25 megapixels. |
| IMG-01 | **Fixed** | Upload normalization applies EXIF orientation, composites transparency over white, and saves RGB. Regression test covers all three. |
| CFG-01 | **Fixed** | Settings exposes Auto, Replicate, Hugging Face, Fal, local ComfyUI, and explicit Demo options with masked key fields. Save reloads the server config. |
| CFG-02 | **Fixed** | A shared backend resolver now drives config preview and generation; frontend capabilities and labels use the effective provider. Tests cover Fal-only and provider priority. |
| GEN-01 | **Fixed** | Unsupported controls are disabled or explained per engine; generated resolution/aspect are read from the saved image; unsupported seed values are no longer reported as used. Live provider payloads were not exercised. |
| GEN-02 | **Fixed** | Generation has a synchronous in-flight guard, and Retry/Regenerate/Demo actions are disabled while a request runs. No real-browser double-click run was performed. |
| FE-01 | **Fixed** | Sketch loads discard stale responses; fresh Studio navigation clears an old project preset. |
| API-02 | **Fixed** | Project response booleans are normalized from SQLite integers; the API regression test checks their JSON types. |
| FE-02 | **Fixed** | Local OpenCV output is labeled as an inspection preview, ComfyUI Canny use is explained, result overlay wording is non-guaranteeing, and the comparison slider measures its container and supports keyboard input. |
| STORAGE-01 | **Not fixed — owner decision** | No cleanup policy was chosen; deleting shared assets could break history/cache references. |
| PROMPT-01 | **Partially fixed** | Removed the unsupported “8k” prompt tag and clarified the word-count heuristic. CLIP token counts remain unverified because no tokenizer was installed and no heavy dependency was added. |
| PRIV-01 | **Not fixed — owner decision** | Settings keys remain in the local SQLite database as plaintext. An OS keychain decision is needed for at-rest protection. |
| DOC-01 | **Fixed** | Product copy, procedural sample descriptions, Demo labels, and generated-result metadata now describe concept images and engine differences without promising exact geometry or board-ready resolution. |
| DOC-02 | **Fixed** | `AUDIT_REPORT.md` is marked historical and points to this current audit. |
| DOC-03 | **Not fixed — owner decision** | Python dependency constraints need a declared support target; no dependency scanner was run. |
| TEST-01 | **Partially fixed** | Added regressions for the fixed behaviors. Tests remain in-process and Demo-mode; no live ComfyUI, cloud-provider, or browser UI end-to-end run was possible. |
| A11Y-01 | **Partially fixed** | Comparison slider now has keyboard operation/value semantics and several icon-only controls have labels. Browser, screen-reader, and contrast checks remain unverified. |
| CONC-01 | **Not fixed** | Low-severity concurrency risk was not reproduced and was not changed. Atomic favorite/cache concurrency behavior remains untested. |

## 9. Final Phase 2 regression commands and results

These commands ran in the isolated clone `/private/tmp/campusvision-audit-20261117` after the code and UI fixes. They did not contact ComfyUI or cloud providers.

| Command | Result |
|---|---|
| `npx tsc --noEmit` (from `frontend/`) | **PASS**, exit 0; no diagnostics. |
| `npm run build` (from `frontend/`) | **PASS**, exit 0; Vite transformed 1,601 modules and built in 818 ms. JS 291.62 kB (81.49 kB gzip), CSS 43.05 kB (7.45 kB gzip). No build warnings. |
| `.audit-venv/bin/python -m py_compile backend/*.py backend/services/*.py` | **PASS**, exit 0; no output. |
| `.audit-venv/bin/python backend/test_suite.py` | **PASS**, exit 0; all 9 checks passed, including explicit Demo generation and static frontend serving. |
| `.audit-venv/bin/python backend/test_prompts_and_samples.py` | **PASS**, exit 0; all 13 regression functions passed, including security, provider, image normalization, metadata, and prompt cases. |
| `env DEFAULT_PROVIDER=demo ./.audit-venv/bin/python backend/audit_test_runner.py` | **PASS**, exit 0; all 8 scenarios passed in Demo mode. |

The Python test scripts emit the existing `StarletteDeprecationWarning` that `httpx` with `starlette.testclient` is deprecated and suggests `httpx2`. The system Python in the original audit environment still lacks FastAPI; the isolated audit virtualenv was used for the passing backend checks.

## 10. Needs owner decision

- Choose an asset-retention policy before removing uploads, generated renders, or cache files referenced by project history.
- Decide whether local API keys require macOS Keychain storage; current Settings persistence is local SQLite plaintext.
- Declare supported Python/platform versions before adding Python dependency constraints or lock files.
- Decide whether concurrent multi-request use is supported; favorite/cache race handling remains a low-priority suspected risk.
