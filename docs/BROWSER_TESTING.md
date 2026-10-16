# Run and test in Chrome

## Connection diagnosis and fix

The backend server defaulted to 3000 but the frontend defaulted to 3001.
The frontend environment example also set `EXPO_PUBLIC_API_URL` to an origin
without `/api/v1`, sending authentication requests to a nonexistent route.
Login's generic catch message also covers non-JSON responses, so it alone does
not distinguish network failure, CORS failure, and a wrong endpoint.

During this investigation both ports responded. An isolated Chrome session
reached 3001 successfully, so the original network failure was not reproducible
in that session. There were two backend processes and two different databases:
the original `backend/city-cleanup.db` contained 192 users, while the newly
configured `backend/data/city-cleanup.db` was empty. The original database has
been preserved and selected for the current local run; neither file was deleted.

Local startup now uses port 3000 consistently. `apiConfig.js` accepts either an
origin or full versioned URL; the server uses the shared port configuration and
loads `backend/.env` by its own location. CORS remains an explicit origin allowlist.
Chrome login/signup preflights and requests succeed. No authentication bypass
or privileged test account was added to the application.

## Environment files

The root `.env` is not the backend or Expo configuration. Current machine-local
configuration is in **backend/.env** and **city-cleanup-challenge/.env**; these
files are ignored by Git. Preserve the existing generated JWT secrets.

Backend values for this machine:

```dotenv
PORT=3000
DATABASE_CLIENT=sqlite
DATABASE_PATH=./city-cleanup.db
CORS_ORIGIN=http://localhost:19006,http://127.0.0.1:19006,http://localhost:80
API_RATE_LIMIT=1000
AUTH_RATE_LIMIT=100
GEMMA_VERIFICATION_ENABLED=true
GEMMA_PROVIDER=ollama
GEMMA_ENDPOINT=http://127.0.0.1:11434/api/chat
GEMMA_MODEL=gemma3:4b
GEMMA_TIMEOUT_MS=600000
CELO_REWARDS_ENABLED=false
CELO_REWARD_DRY_RUN=true
```

Fresh installs may use the new empty `./data/city-cleanup.db` from the example;
do not switch an existing installation's database path inadvertently.
AI remains disabled by default in the checked-in example and application code.

Frontend:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Expo embeds this value in the bundle. Restart Expo with `--clear` after changing
it and hard-refresh Chrome. A terminal environment variable overrides `.env`.

Local admin polling uses about 90 requests per 15 minutes per open tab, plus
image loads and other requests. The previous general limit of 100 could therefore
block login as well as polling. Local development now allows 1000 API requests
and 100 authentication attempts per 15 minutes per IP. Production configuration
and code defaults remain unchanged. Restart the backend after changing these
values; the current in-memory rate-limit counters reset on restart.

## Start services (three PowerShell terminals)

These services are already running after the repair. Do not start duplicate
servers. For subsequent restarts, stop the existing process first.

1. Local Ollama on this machine, using the already-downloaded model cache:

```powershell
cd E:\Projects\city-cleanup-challenge
& .\.local-inference\start-ollama.ps1
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

The ignored launcher binds to loopback and uses `.local-inference/models`.
On another machine with a standard Ollama installation, use `ollama pull
gemma3:4b` once and `ollama serve` instead. Do not run both servers.

2. Existing backend and database:

```powershell
cd E:\Projects\city-cleanup-challenge\backend
$env:PORT='3000'
npm start
```

3. Existing Expo application:

```powershell
cd E:\Projects\city-cleanup-challenge\city-cleanup-challenge
$env:EXPO_PUBLIC_API_URL='http://localhost:3000/api/v1'
$env:EXPO_NO_TELEMETRY='1'
npm start -- --web --port 19006 --clear
```

Use the repository's required Node 22. This machine currently has Node 24.19.0;
executed checks are reported for that runtime.

## Browser checklist

1. Open <http://localhost:3000/health> and <http://localhost:3000/ready>:
   both should return HTTP 200 with a connected/ready database.
2. Open <http://localhost:19006>. Hard-refresh (`Ctrl+Shift+R`). Register using
   **Create an account** (all profile fields, password at least 10 characters),
   then sign in. Existing users remain in the original database. If a stored
   session is stale, sign out and sign in again.
3. Open **Submit evidence**, or <http://localhost:19006/#/evidence> after login.
   Click the before/after boxes to select permitted photos from disk. Mobile
   still uses the camera. Desktop selection time is not verified capture time;
   existing metadata/security checks and human review continue to apply.
4. For development only, select `docs/demo/gemma/before.png` and `after.png`.
   These are labeled illustrations. Set a test item count and explicitly write
   **ILLUSTRATIVE TEST ONLY; no actual cleanup, quantities, impact or rewards**
   in Notes. Do not represent these as real-world evidence. Reusing the exact
   same images triggers duplicate rejection, even across accounts; this is
   expected. The previous browser run already submitted these files.
5. Check GPS consent and allow Chrome location access for localhost. Actual
   submissions require a working device/browser location service. The automated
   browser run used explicitly emulated coordinates; there is no application
   location bypass. If Chrome cannot locate this desktop, retry on a device
   with location available; do not invent coordinates for real evidence.
6. Submit. Evidence is saved immediately and **Gemma live analysis** opens as a
   chat-style conversation. Keep the page open: it owns the authenticated live
   analysis request, rather than scheduling a background worker. Progress shows
   actual preprocessing and generation activity; there may be several minutes
   before the first model output on CPU. The deadline is 10 minutes per attempt.
   Closing or leaving the page cancels inference and keeps the evidence saved.
   Repeated/invalid findings are withheld. Accepted findings appear line by line
   after full validation, paced at 300 ms per line for readability.
   A receipt confirms that the images were received and asks the uploader to
   wait for verification and human approval. The latest record keeps this
   acknowledgement visible while review is pending.
7. Completed results show `gemma3:4b`, assessment, visible categories, visual
   differences, concerns, limitations, safe recommendations and **Human decision
   required**. Timeout or invalid model output shows an unavailable state and
   preserves evidence for human review; do not assume every output passes checks.
8. The submission page shows only the signed-in user's latest submission, Gemma
   analysis, and human approval status. Earlier evidence remains stored.
   An existing authorized admin opens **Stored evidence** from Home or
   <http://localhost:19006/#/stored-evidence> to review stored submissions and
   enters a reason before approving or rejecting.
   This admin page separates **Pending**, **Approved**, and **Rejected** records
   into tabs with counts, refreshing every 10 seconds even when the queue is
   empty. Approved includes subsequent payment-pending/paid states. AI-pending
   evidence remains in Pending until a human decision; decision controls appear
   only when the AI attempt has finished.
   Admin Home also has separate **Pending**, **Rejected**, and **Approved** cards
   linking directly to those sections. Its primary action is **Review pending
   evidence**. Submit evidence remains on ordinary users' Home; the admin's
   legacy evidence URL opens the review queue instead of an upload form.
   While Gemma is pending, Approve/Reject controls are withheld and direct review
   requests return `409 AI_REVIEW_PENDING`. Once analysis finishes the controls
   appear. AI timeout/unavailability retains manual review as a fallback.
   Ordinary users cannot self-approve or assign admin roles. An owner can appeal a rejection
   once. Reward broadcasting remains disabled for this local test.
   The user's page receives AI events through the live connection. After that,
   it refreshes every 10 seconds while human review is pending so the decision
   appears without a manual reload.

In Chrome DevTools, Network should show `POST
http://localhost:3000/api/v1/login`, then authenticated `/evidence/submissions`
requests. A 401 with `Invalid credentials` means the API was reached. If requests
still target 3001, restart Expo and clear the browser's cached bundle/site data.
Do not paste access tokens or private images into issue reports.

## Executed checks and limits

The earlier background-worker records below are historical. Current foreground
streaming validation is recorded separately in
[browser-live-chat.json](demo/gemma/browser-live-chat.json). No worker is started
by the current upload route.

The foreground browser run completed successfully with local `gemma3:4b`:
184.839 s total (27 ms preprocessing, 11 ms model loading, 165.298 s prompt
processing, 19.363 s generation). Chrome observed generation at 166.838 s and
validated findings at 186.039 s from clicking Submit. This is one measured run
with JPEG copies of labeled illustrations, not a controlled comparison or
real-photo accuracy claim. The first development attempt was cancelled by hot
reload; cancellation preserved evidence and stopped Ollama. The final recorder
initially selected a CORS preflight response; that collection check was corrected
without rerunning inference. The report includes this limitation.

Current checks: 139 backend tests / 20 suites, 25 frontend tests / 8 suites,
and both lint checks passed. Streaming tests cover fragmented provider output,
missing terminal frames, cancellation, owner-only access, duplicate live-request
rejection, deferred inference until the stream opens, and human decision gating.

Automated suites exercise duplicate rejection, private image access, admin
authorization, appeals, human decisions during slow inference, timeout fallback,
and reward controls. Browser signup/login and file submission use the running
application and actual local Ollama, with no model mocks in that browser path.
The recorded result is [browser-workflow-live.json](demo/gemma/browser-workflow-live.json).
On 2026-10-16, Chrome registration and login returned 200, the upload returned
201 in 315.955 ms, and the pending panel updated automatically to actual
`gemma3:4b` findings after 208.144 seconds of inference (25.938 s loading,
161.351 s prompt processing, 20.714 s generation, 27 ms preprocessing).
The model recognized a simulated illustration, kept categories empty, and
reported uncertainty with human review required. A second browser upload was
rejected as an exact duplicate and skipped AI. The original submission remains
awaiting human review; no approval or payout was performed on this test evidence.
This is one development run under concurrent test load, not an accuracy claim
or a new controlled performance comparison. Backend: 20 suites / 134 tests
passed. Frontend: 5 suites / 19 tests passed. Both lint checks passed.
Real before/after cleanup photograph validation remains pending permissioned
photographs; illustrations cannot establish real-photo accuracy or impact.

```powershell
cd E:\Projects\city-cleanup-challenge\backend
npm test -- --runInBand
npm run lint
cd ..\city-cleanup-challenge
npm test
npm run lint
```
