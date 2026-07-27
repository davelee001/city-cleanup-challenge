# Phase 16 - Product and Device Completion

## Shipped product surface

Only working release features are visible:

- the unfinished social dashboard is not linked or bundled into navigation;
- member-facing simulated analytics, random charts, hard-coded maps, fake
  exports, and false system-status claims are hidden;
- administrator impact analytics remains available and reads protected backend
  data;
- the web event map is explicitly view-only and directs GPS check-in to mobile;
- camera, photo-library, and foreground-location permission purposes are
  declared in the Expo configuration.

Social and advanced reporting can return only after their APIs, empty/error
states, authorization, tests, and device behavior pass the release gate.

## Supported-device policy

The release target is:

- the current and previous major Chrome, Edge, Firefox, and Safari releases;
- maintained Android devices with camera, photo-library, and foreground GPS;
- maintained iOS devices with camera, photo-library, and foreground GPS;
- responsive widths from 320 pixels through desktop.

Record the exact browser, operating-system, and device versions used for each
release. An emulator is useful but does not replace at least one physical
Android and one physical iOS evidence-upload test.

## Device acceptance matrix

For each supported platform, verify:

- signup, sign-in, token refresh, sign-out, and session restoration;
- allowed and denied camera, photo-library, and location permissions;
- JPEG, PNG, and WebP evidence selection, preview, upload, private retrieval,
  duplicate rejection, oversize rejection, and retry after network loss;
- map loading, location-denied fallback, location accuracy, and distance-based
  check-in validation;
- admin analytics and audit-event authorization;
- keyboard navigation, screen-reader labels, 200% zoom, and narrow layouts;
- offline app-shell loading without caching or replaying API mutations;
- PWA installation, relaunch, update, and uninstall;
- production email and notification delivery only when those providers and
  user-consent flows are enabled.

The build validates the PWA manifest, metadata, icon, offline shell, and API
cache bypass. Service workers are served with no-store update headers.
State-changing requests are never queued for background replay.

## Isolated upload and image-processing load

Prepare a JSON file outside Git containing unique, approved synthetic fixture
pairs:

```json
[
  { "before": "C:\\fixtures\\before-01.jpg", "after": "C:\\fixtures\\after-01.jpg" },
  { "before": "C:\\fixtures\\before-02.jpg", "after": "C:\\fixtures\\after-02.jpg" }
]
```

Then run only against isolated staging:

```powershell
$env:STAGING_API_URL = "https://api.staging.example.org"
$env:STAGING_TEST_USERNAME = "<dedicated-load-user>"
$env:STAGING_TEST_PASSWORD = "<secret>"
$env:STAGING_UPLOAD_FIXTURE_MANIFEST = "C:\secure\fixture-manifest.json"
$env:STAGING_UPLOAD_CONCURRENCY = "2"
$env:STAGING_UPLOAD_SUBMISSIONS = "2"
$env:STAGING_UPLOAD_LOAD_CONFIRM = "CREATE_STAGING_LOAD_EVIDENCE"
npm run staging:upload-load
```

The runner requires HTTPS, normally requires `staging` in the hostname, caps
concurrency at 10 and submissions at 100, and requires one unique before/after
pair per submission so duplicate detection is not accidentally benchmarked.
It reports created record IDs, error rate, and p95 latency. Records are durable;
retain or remove them through the approved moderation and retention workflow.

## Live completion evidence

Phase 16 is operationally complete only when the device matrix and isolated
upload load run have named operators, timestamps, versions, screenshots or
logs, created record IDs, thresholds, results, and approved cleanup evidence.
