# Database and Evidence Operations

## Production architecture

Production uses PostgreSQL for shared application state and a private S3 bucket
for cleanup evidence. SQLite remains the default for local development and
automated tests.

The backend applies ordered SQL migrations at startup. Each applied filename
and SHA-256 checksum is recorded in `schema_migrations`. A PostgreSQL advisory
lock ensures that only one replica migrates at a time. Never edit an applied
migration; add a new numbered migration instead.

## Staging migration check

Set `DATABASE_CLIENT=postgres` and `DATABASE_URL`, start the backend, and run:

```bash
npm run db:verify
```

The command fails when a required core table is absent or startup migration
fails. Run the full API integration suite against the staging database before
promoting the image.

## Importing an existing SQLite database

Take a copy of the SQLite file while the old API is stopped. Point
`DATABASE_URL` to a fresh PostgreSQL database whose startup migrations have
already run, then execute:

```bash
npm run db:import-sqlite -- /secure-copy/city-cleanup.db --confirm-import
npm run db:verify
```

The importer preserves IDs, advances identity sequences, skips legacy tables
that are not part of the production core, and refuses to import into a target
that already contains application rows. Keep the source copy until the staging
smoke test and record-count reconciliation are approved.

## PostgreSQL backups

The host running these commands needs PostgreSQL 17 client tools. Create a
custom-format backup in a restricted directory:

```bash
npm run db:backup -- /secure-backups/city-cleanup-2026-07-25.dump
```

Encrypt backups at rest, restrict access, copy them to a separate backup
account, and define a retention schedule. A successful command is not enough:
perform a scheduled restore drill into an isolated database.

Restore is intentionally guarded:

```bash
DATABASE_URL=postgresql://restore-user:secret@restore-host/restore-db \
  npm run db:restore -- /secure-backups/city-cleanup-2026-07-25.dump --confirm-restore
npm run db:verify
```

The restore command cleans conflicting objects in the target database. Never
point it at production during a drill.

## Evidence protection and restore

The evidence bucket must:

- block all public access;
- require TLS and server-side encryption;
- grant the backend only object read, write, and delete access under the
  configured `EVIDENCE_S3_PREFIX`;
- enable versioning before accepting uploads;
- use a backup policy in a separate encrypted backup vault or account;
- retain non-current versions according to the approved photo-retention policy;
- log object access and administrative changes.

Test restoration quarterly by restoring a sample object version, confirming
its SHA-256 value against `cleanup_evidence_files.sha256`, loading it through
the authenticated evidence endpoint, and deleting only the isolated test copy.

## Recovery order

1. Stop reward broadcasting and place the API in maintenance mode.
2. Restore PostgreSQL into an isolated target and run `npm run db:verify`.
3. Confirm the evidence bucket or restored prefix contains the paths referenced
   by `cleanup_evidence_files`.
4. Test authentication, evidence access, moderation, and a dry-run reward.
5. Switch the backend secret to the restored database.
6. Resume traffic, then rewards, while monitoring errors and payout metrics.

Record recovery point and recovery time results after every drill.
