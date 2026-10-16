# Gemma Smart Verification

## Audited architecture

The repository has an Express 5 backend (`backend/src/app.js`), Expo/React
Native frontend (`city-cleanup-challenge`), and separate Celo contracts. The
database adapter (`backend/src/db.js`) supports SQLite locally and PostgreSQL.
Both schemas already store `cleanup_submissions.verification_summary` as JSON
text, evidence fingerprints, reviewer decisions, and submission transitions.

`/api/v1/evidence` is mounted after `authenticateUser`. Its upload route checks
image contents, required GPS/capture fields, SHA-256 duplicates, perceptual
duplicates, scene consistency, metadata integrity and image quality. Exact
duplicates are rejected; other submissions enter manual review. Owner/admin
checks protect records and image delivery. `evidenceStorage.js` stores private
local files or encrypted S3 objects. Admin review prevents self-review, records
transitions, and invokes `ensureRewardClaim` only after approval. Owners can
appeal rejection once. These mechanisms remain in place.

`enhancedImageUpload.js` is a separate general upload pipeline. Its brightness
based impact/volume estimates are legacy heuristics, not Gemma inference or
validated physical measurements. This integration leaves that pipeline intact
and does not use its estimates as Gemma findings.

`Evidence.js` already provides camera capture, GPS consent, authenticated photo
previews, submission history, appeals and admin decision controls. Other screens
include events, progress, dashboard, wallet and reward administration. The new
`components/SmartVerification.js` follows the existing dark-blue design and
appears alongside private before/after photos for owners and admins.

## Configuration and local setup (PowerShell, Node 22)

Install [Ollama](https://ollama.com/download), then fetch a vision-capable Gemma 3:

```powershell
ollama pull gemma3:4b
ollama serve
```

If the Ollama desktop service is already running, do not start a second server.
Gemma 3 4B, 12B and 27B support images; 1B does not. Choose according to available
memory and latency, and verify the model license for your use.
See the [Google model card](https://ai.google.dev/gemma/docs/core/model_card_3)
and [Ollama structured output documentation](https://docs.ollama.com/capabilities/structured-outputs).

```powershell
cd E:\Projects\city-cleanup-challenge\backend
npm ci
Copy-Item .env.example .env # Only on first setup; preserve an existing .env
```

Set two distinct random JWT secrets in `.env` as required by the existing app.
Set these backend values:

```dotenv
PORT=3000
GEMMA_VERIFICATION_ENABLED=true
GEMMA_PROVIDER=ollama
GEMMA_ENDPOINT=http://127.0.0.1:11434/api/chat
GEMMA_MODEL=gemma3:4b
GEMMA_TIMEOUT_MS=600000
GEMMA_IMAGE_MAX_SIZE=1024
GEMMA_MAX_OUTPUT_TOKENS=384
GEMMA_CONTEXT_LENGTH=2048
GEMMA_NUM_THREADS=4
GEMMA_API_KEY=
CELO_REWARDS_ENABLED=false
CELO_REWARD_DRY_RUN=true
```

The feature defaults to disabled unless the flag is exactly `true`. Restart the
server after configuration changes. The application timeout defaults to 45000 ms;
the explicit 600000 ms above accommodates measured slow CPU inference.
Heuristic checks run before storage; AI work starts from the uploader's open page.
The upload returns HTTP 201 with `smartVerification.status=pending`, without
waiting for inference. The page then opens authenticated `POST
/api/v1/evidence/submissions/:id/analyze` and reads NDJSON events in a live chat
panel. Old completed/failed submissions are not re-analyzed.

```powershell
npm run dev
```

In another terminal:

```powershell
cd E:\Projects\city-cleanup-challenge\city-cleanup-challenge
npm ci
$env:EXPO_PUBLIC_API_URL='http://localhost:3000/api/v1'
npm start -- --web --port 19006
```

Use the existing signup/login and Evidence screen. The sample CORS configuration
allows port 19006; update `CORS_ORIGIN` if you use another frontend origin.

For the existing local database, browser photo upload, service startup commands,
and a complete browser checklist, see [Browser testing](BROWSER_TESTING.md).

## Hosted inference

Set `GEMMA_PROVIDER=openai`, `GEMMA_ENDPOINT` to the **complete** HTTPS chat
completions URL (for example `https://your-provider/v1/chat/completions`),
`GEMMA_MODEL` to that service's deployed Gemma 3 vision model identifier, and
`GEMMA_API_KEY` to its server-side bearer token. The endpoint must support
multimodal data URLs and `response_format.type=json_schema`; arbitrary hosted
services are not necessarily compatible. Ollama-compatible hosted services can
instead use `GEMMA_PROVIDER=ollama` and their complete HTTPS `/api/chat` URL.
Use a smoke test to establish compatibility; unsupported responses fall back to
manual review. HTTP is allowed only for loopback. Redirects and URL credentials
are rejected. Endpoint configuration is server-controlled, never user input.

Never put keys in `EXPO_PUBLIC_*`. Only two resized JPEGs are sent, in before/after
order. Re-encoding strips EXIF/GPS; account details, notes, filenames and submitted
quantities are not sent. Photos may still contain faces or other identifying
content: select appropriate consented photos and an approved provider/retention
policy before enabling hosted processing. Images remain private in the app.

## Findings and limitations

The persisted `verification.smartVerification` has `status` (`disabled`,
`skipped`, `pending`, `completed`, `unavailable`), version, and for completed inference,
provider, configured model name, analysis timestamp and validated `findings`:

- Qualitative assessment and enumerated waste categories.
- Visual differences and possible environmental concerns.
- Explicit limitations and safe cleanup recommendations.
- Cleanup evidence (`visible_improvement`, `no_visible_improvement`, `uncertain`)
  and same-scene assessment (`likely`, `unlikely`, `uncertain`).
- Human review requirement, enforced by the server regardless of model output.

The JSON schema rejects extra fields (including invented weight/count fields),
bad enums, missing fields, excessive lengths and malformed lists. At most one
finding is allowed in each generated text list. Prompts prohibit
invented measurements and instruct the model to ignore instructions embedded in
images. Schema validation cannot prove the truth or safety of generated prose;
reviewers must check findings, hazards and recommendations against the photos.
AI cannot establish exact counts, weight, disposal, location or authenticity.
Additional conservative checks reject exact/near repeated findings, selected
obvious contradictions, unsupported numeric measurement claims, organic-category
claims without a corresponding waste description, and illustrative assessments
that fail to mark cleanup evidence uncertain. These are heuristics, not visual
truth tests; they can miss errors or reject valid observations. Rejected output
is withheld from the findings panel and leaves human review available.

Unavailable/uncertain analysis adds a review reason and can raise low risk to
medium; it never reduces existing risk. Exact duplicates skip inference. All
nonduplicate submissions still require human review, including apparently clear
improvements. No AI decision mints tokens or changes reward policy.

Requests abort after the configured timeout (100–600000 ms; default 45000 ms), response bodies
are capped at 64 KiB, and the application worker runs one inference at a time.
The adapter also limits direct calls to two per process. Busy, failed and invalid
responses preserve submission and manual review.
Provider error bodies and raw model output are not logged or exposed by the app.
Safe timing metadata records preprocessing, request, model loading, prompt/image
processing and generation, where the provider supplies these metrics.

Verification is now foreground and tied to the uploader's live HTTP request.
The route does not start the legacy polling worker or kick inference after
upload. It reuses `evidenceAiWorker.js`'s private reads and compare-and-swap
persistence through `analyzeSubmission`; legacy worker helpers remain covered
by tests but are not scheduled by the application.

Only the owner can start a stream. Only one live stream per submission is allowed
in this API process; global inference concurrency remains bounded. Images are
private and stripped of metadata. The response is authenticated NDJSON with
`Cache-Control: private, no-store`, ten-second keepalive events, and proxy
buffering disabled. Ollama's actual streamed generation emits character-count
progress, never unvalidated model text. Once the full structured output passes
schema and quality checks, validated findings are sent as individual events.
The UI reveals these lines every 300 ms for readability; this pacing is only
presentation, not incremental model reasoning or earlier validation.

Leaving the page aborts the model request; evidence remains saved with an
unavailable/cancelled result for human review. A server interruption can leave
a pending record; reopening it as its owner starts a new foreground attempt.
Finished timeout/invalid/cancelled results are not automatically retried. The
hosted-compatible provider retains a non-streaming request, with live progress
and validated finding events provided by the application. There is no new
public image or credential endpoint. Human review works
after AI has finished. While AI is pending, both the UI and API block human
approval/rejection (`409 AI_REVIEW_PENDING`). If AI times out or becomes
unavailable, human review remains available as the existing fallback; disabled
AI and legacy records also retain their manual review workflow.

## Verification

```powershell
cd E:\Projects\city-cleanup-challenge\backend
npm test -- --runInBand
npm run lint
npm run gemma:demo
npm run gemma:smoke -- ../docs/demo/gemma/before.png ../docs/demo/gemma/after.png
```

The last command is opt-in real inference; it requires the flag and service,
prints validated results, and exits nonzero on disabled/failed inference. The
generated pictures are labeled illustrations, so output is not evidence of
real cleanup. Also test consented real photos locally for qualitative evaluation.

For a recorded live demonstration against local Ollama with `gemma3:4b`:

```powershell
npm run gemma:demo:live
```

This command explicitly enables AI for that process only, uses the two labeled
illustrations, and calls the existing `verifyEvidencePair` function. It records
the real Ollama response, server version, model digest, runtime metadata, input
hashes, wall time, and validated verification summary in
`docs/demo/gemma/live-inference-v2.json`. The original v1 record remains unchanged.
It does not insert database records or
issue rewards. It exits nonzero if inference does not complete. The recordings
do not use the illustrative sample findings fixture.
The live-demo command defaults to a 600000 ms deadline for CPU execution;
ordinary application requests retain the 45000 ms default. A slower CPU may
need this explicit configuration or a faster inference host for interactive use.

```powershell
cd E:\Projects\city-cleanup-challenge\city-cleanup-challenge
npm test -- --watch=false
npm run lint
npm run build:web
```

Mocked tests cover disabled mode, image metadata removal, hosted payloads,
validation failures, deadlines, duplicate preservation, uncertainty, authenticated
persistence, and frontend findings/fallback rendering. Existing API tests cover
privacy, admin decisions, appeals and reward policy. PostgreSQL, hosted-provider
compatibility, actual model quality and phone camera behavior need deployment
validation; mocks do not establish those results.

Validation executed for this change: backend 17 suites / 112 tests passed;
frontend 5 suites / 16 tests passed; both lint commands passed; production web
export and PWA validation passed; sample generation passed. The available
runtime was Node 24.19.0, while the repository requires Node 22; repeat checks
under Node 22 before deployment. Expo needed expanded filesystem access for
generated logs/artifacts; its successful build used `EXPO_NO_TELEMETRY=1` and
`EXPO_OFFLINE=1`. The initial implementation used mocked inference. Subsequent
real local inference is recorded below. No hosted-provider request, actual demo
submission, or real reward payout was executed.

## Executed real local inference

On 16 October 2026, `npm run gemma:demo:live` completed real inference using
Ollama 0.40.5 and `gemma3:4b` (Q4_K_M) on CPU, with no GPU memory used. The
official model blobs were verified against registry SHA-256 digests. The
portable runtime's Windows executable had a valid Ollama Inc. signature.
Runtime and model files are in the ignored `.local-inference/` workspace cache.

- [Complete live record](demo/gemma/live-inference.json): actual provider response,
  validated findings, image hashes, model digest and runtime metadata.
- [First timed-out run](demo/gemma/live-inference-timeout.json): the initial
  120-second deadline produced the existing manual-review fallback.
- Inputs: [before illustration](demo/gemma/before.png) and
  [after illustration](demo/gemma/after.png), both prominently labeled synthetic
  demo data. These are not photographs of a real cleanup.

The successful request took **303113 ms** (about five minutes), with 981 prompt
tokens and 537 generated tokens. Provider-reported prompt evaluation took
161.65 seconds and generation took 118.21 seconds. Model digest:
`68ceab7e468a31c988b44d5a4984a0e21f58c4f7158c6ce29c1804babac38df7`.

Gemma returned `visible_improvement` and `sameScene: likely` and recognized the
illustrative nature of the inputs. Output quality was imperfect: it repeated
several entries, incorrectly claimed the colored litter markers appeared in
both images, and included an unsupported organic-waste category. Therefore this
is evidence of real model execution and structured-output handling, **not** an
accuracy benchmark or an approved cleanup. The raw model returned
`needsHumanReview: false`; the application correctly enforced `true`. Schema
validation does not detect every incorrect visual claim.

To reuse the downloaded portable runtime after stopping it, start a dedicated
PowerShell terminal with:

```powershell
cd E:\Projects\city-cleanup-challenge
$env:OLLAMA_MODELS="$PWD\.local-inference\models"
$env:OLLAMA_HOST='127.0.0.1:11434'
$env:OLLAMA_CONTEXT_LENGTH='4096'
$env:OLLAMA_NUM_PARALLEL='1'
& .\.local-inference\ollama\ollama.exe serve
```

Then run `npm run gemma:demo:live` from `backend` in another terminal. The local
server was left running after this demonstration. This CPU requires an explicit
longer deadline; the ordinary application's default remains 45 seconds. Use
faster hardware or compatible hosted inference for a responsive presentation.
The timeout extension was checked with 17 focused verification tests and backend
lint; all passed.

For the subsequent optimization work and current measured results, see
[Gemma benchmark report](GEMMA_BENCHMARK.md). The original 303-second record is
preserved unchanged; use the versioned benchmark records for optimized requests.

## Real-photo validation remains pending

The repository currently contains only labeled illustrations, and the owner
confirmed that consented real before/after photographs are not available. No
real-world waste-detection accuracy, cleanup impact or measured quantity is
claimed. The illustrative workflow is solely an engineering demonstration.

When consented real photographs become available, keep the files outside tracked
demo directories, use local Ollama, and run `gemma:smoke` with the two explicit
file paths. Confirm permission, scene matching, category labels, visibility and
actual differences with an independent reviewer. Test ambiguous scenes, little
or no improvement, different viewpoints, small litter and potentially hazardous
items. Record false positives/negatives and repeats on several pairs; do not
tune prompts against a single photo pair and then report that pair as an accuracy
evaluation. Re-measure latency and image-detail loss before reducing resolution
for production. Do not add private photographs or provider outputs to Git.

`npm run gemma:workflow` exercises real inference through the application API in
a newly isolated SQLite database under ignored `.local-inference/`, with clearly
synthetic photos/counts/coordinates, temporary demo actors and rewards disabled.
It checks authenticated submission, private image access, duplicate rejection,
foreground streamed completion, mandatory human review, admin decisions, one-time appeals
and absence of paid rewards. It writes only a labeled report to
`docs/demo/gemma/workflow-live.json`, never credentials. This does not validate
camera/GPS hardware behavior or real-photo accuracy.

## Reproducible hackathon demo (about three minutes)

Fresh CPU inference currently takes about 192 seconds on the measured pair.
For a three-minute slot, demonstrate submission and foreground chat analysis live, then
show the clearly labeled recorded result and its actual timing. Allow a longer
slot to wait for fresh inference. See the benchmark report for cache limitations;
do not describe recorded or cached output as a new uncached run.

Use an isolated local demo database and leave rewards disabled/dry-run. Prepare
an ordinary demo user and a distinct authorized admin through your existing
administration process; this feature adds no default admin or privilege bypass.
All illustrative photos and sample findings are prominently labeled. The sample
JSON is a test fixture, never substituted for real inference in the app.

1. **Problem (20s):** Explain that communities need useful evidence of cleanup,
   while photographs alone cannot prove weight, safe disposal or authenticity.
2. **Submission (35s):** Show the user capturing the same scene before/after,
   entering their own category/quantity, and consenting to GPS. For a deterministic
   fixture path, run `npm run gemma:demo`, log in as the local ordinary demo user,
   and pass that user's access token to the local-only submission helper:

   ```powershell
   $env:DEMO_ACCESS_TOKEN='<local demo user access token>'
   npm run gemma:demo:submit
   Remove-Item Env:DEMO_ACCESS_TOKEN
   ```

   This creates a normal authenticated submission of labeled drawings with
   explicitly illustrative coordinates/count and timestamps, using the actual
   inference service. It does not bypass checks or seed approved records. On
   repeated identical uploads, exact duplicate rejection is expected. Use a fresh
   isolated demo database for a fresh first-submission run.
3. **Gemma (40s):** Refresh the Evidence screen; show both images, configured
   model, visible categories, qualitative changes, concerns and limitations.
   State whether inference was live. If unavailable, show the fallback honestly
   and use `sample-findings.json` only as a labeled illustration of output shape.
4. **Human oversight (35s):** Sign in as the separate admin, compare the photos
   with AI findings, enter a review reason, and approve or reject through the
   existing controls. Explain that example drawings are demo data; do not award
   real funds. Show the recorded status and explain one-time appeals.
5. **Impact and innovation (30s):** Explain the combination of local vision,
   private evidence, uncertainty-aware human oversight and existing community
   tracking/reward controls. Discuss potential reviewer assistance without
   claiming measured accuracy, time savings or environmental totals.
6. **Resilience (20s):** Stop Ollama and submit a new distinct pair; show that
   provider failure still saves evidence for human review. Restore Ollama.

Judging alignment: demonstrate actual multimodal request and validated output
(Gemma 30%); submission/review/fallback (functionality 20%); privacy, safe
community participation and accountable human oversight (innovation/impact 30%);
a clear labeled story with honest limitations (presentation 20%).
