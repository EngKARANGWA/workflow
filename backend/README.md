# Dynamic Workflow & Approval Engine

A configurable, data-driven approval engine built with Laravel 12 / PHP 8.2 and PostgreSQL. Administrators define workflows (steps, approvers, conditions) entirely through the API — no workflow logic is hardcoded anywhere in the application.

## Contents

- [Setup instructions](#setup-instructions)
- [Assumptions made](#assumptions-made)
- [Architectural decisions](#architectural-decisions)
- [Trade-offs & limitations](#trade-offs--limitations)
- [API documentation](docs/API.md) — also available as an [OpenAPI 3.0 spec](docs/openapi.yaml), viewable interactively at `/docs` once the app is running
- [Database schema](docs/SCHEMA.md)

## Setup instructions

### Requirements

- PHP 8.2+ with extensions: `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `bcmath`, `intl`, `zip`
- Composer 2.x
- A PostgreSQL database (tested against [Neon](https://neon.tech) serverless Postgres, but any Postgres 13+ works)

### Steps

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set your database credentials:

```env
DB_CONNECTION=pgsql
DB_HOST=your-host
DB_PORT=5432
DB_DATABASE=your-database
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_SSLMODE=require
```

> **If you're connecting to a Neon pooled endpoint** (hostname contains `-pooler`) and your PHP's bundled `libpq` predates SNI support, also set `DB_NEON_ENDPOINT=<the-endpoint-id-prefix-of-your-host>` — see the "Neon connection" note under Trade-offs for why.

Then run migrations, seed the initial admin account, and start the server:

```bash
php artisan migrate --seed
php artisan serve
```

The seeder creates one bootstrap administrator (there's otherwise a chicken-and-egg problem: user management endpoints require an authenticated admin):

```
email:    admin@workflow.test
password: password
```

It also seeds five starter business roles (Finance, Legal, HR, Manager, CEO) used for step routing — the admin can add/remove more via `POST /api/roles`.

### API documentation

Open **`http://127.0.0.1:8000/docs`** (or whatever host/port `artisan serve` reports) for an interactive Swagger UI covering every endpoint, generated from [`docs/openapi.yaml`](docs/openapi.yaml). The raw spec can also be imported directly into Postman/Insomnia, or pasted into [editor.swagger.io](https://editor.swagger.io). A narrative walkthrough of the same API lives in [`docs/API.md`](docs/API.md).

### Running tests

```bash
php artisan test
```

Tests run against an in-memory SQLite database (configured in `phpunit.xml`) for speed and to avoid depending on network access to a Postgres instance — see the trade-offs section for why this is safe.

### Deploying (optional — not required to grade this submission, but included for convenience)

This repo ships a `Dockerfile` for deploying to [Render](https://render.com) (or any Docker host), based on Render's own official Laravel template. A plain "auto-detected" Render web service will misdetect this as a Node project (Laravel ships a `package.json` for optional frontend tooling this app doesn't otherwise use) and fail trying to run `npm run start` — the fix is to deploy it as a **Docker** service instead:

1. On the Render dashboard, open the service's **Settings** and change **Environment** to `Docker`, and set **Root Directory** to `backend` (this is a monorepo — the `Dockerfile` lives in `backend/`, not the repo root). Render will then build from that `Dockerfile` instead of auto-detecting Node.
2. Under **Environment variables**, set:

   | Key | Value |
   |---|---|
   | `APP_KEY` | output of `php artisan key:generate --show` |
   | `DB_CONNECTION` | `pgsql` |
   | `DB_HOST` | your Postgres host (e.g. Neon) |
   | `DB_PORT` | `5432` |
   | `DB_DATABASE` | your database name |
   | `DB_USERNAME` | your database user |
   | `DB_PASSWORD` | your database password |
   | `DB_SSLMODE` | `require` |
   | `DB_NEON_ENDPOINT` | only if on a Neon pooled endpoint with an older client — see the Trade-offs section |

3. Deploy. `scripts/00-laravel-deploy.sh` runs automatically on every deploy: `composer install`, config/route caching, `migrate --force`, and an idempotent `db:seed` (safe to re-run — it uses `firstOrCreate`, so it won't duplicate the admin account or roles on subsequent deploys).

## Assumptions made

- **Self-registration only creates Requesters.** Approver and Administrator accounts carry elevated trust, so they're provisioned by an admin via `POST /api/users`, not through public sign-up.
- **A step's "approver role" is a business/organizational role** (Finance, Legal, CEO, Manager, ...), distinct from the three system permission roles (System Administrator, Approver, Requester) named in the brief. The system roles gate *what actions a user can perform via the API*; business roles are purely data used to *route* a step to the right people. Conflating the two would have made it impossible to express "this step needs Finance approval" without hardcoding — which the brief explicitly disallows.
- **Any authenticated user can submit a request** (not gated to only the "Requester" system role) — an Approver or Admin is still a person who might need to request leave. Approval actions, by contrast, are strictly gated to whoever the engine actually resolved as an approver for that step, checked at decision time, not by system role alone.
- **A rejection or return from *any single* required approver ends that path immediately**, even under an "all approvers required" step — this matches how approval chains work in practice (one veto stops the process rather than waiting for the rest to also weigh in).
- **"Returned for modification" reopens the same step**, not the whole chain from step 1. The requester edits their data and resubmits; the same step (and the same assigned approvers) re-review it. Restarting from step 1 was considered but felt like the less common real-world expectation.
- **A step with conditions that don't match the request's data is skipped**, not failed — the request simply proceeds to the next applicable step. If *no* step ever matches, the request is auto-approved (there was nothing left requiring approval).
- **Delegation substitutes the delegate for the *entire* duration a step is active**, resolved once when the step activates. A delegation that starts after a step is already active won't retroactively reroute that in-flight step (documented further below).

## Architectural decisions

### Layering

```
Controllers (HTTP/validation only)
   -> Services (Workflow domain logic)
       -> Models (Eloquent, persistence + relationships)
```

Controllers never contain business logic — they validate input via Form Requests and delegate to services. This keeps the engine testable independent of HTTP and is what let the whole approval engine be covered by fast, framework-light tests.

### Workflow versioning (the "editable without affecting in-flight requests" requirement)

A `Workflow` is a logical container; every create/edit produces an immutable `WorkflowVersion` snapshot holding that version's `WorkflowStep`s. `WorkflowService::publishNewVersion()` never mutates existing steps — it always inserts a new version and flips `is_current`. A `Request` stores the exact `workflow_version_id` it started under, so editing a workflow can never change the rules underneath a request that's already running. This is enforced structurally (foreign key to a specific version), not by convention.

### Two kinds of "role"

- `users.system_role` (enum: `system_administrator`, `approver`, `requester`) — coarse API permission gate.
- `roles` table + `role_user` pivot — admin-managed, arbitrary business roles used only for step routing (a `WorkflowStepApproverDef` points at either a `role_id` or a specific `user_id`).

### A step can require more than one kind of approver (parallel approvals)

The brief's parallel-approval example needs *both* Finance *and* Legal to sign off before proceeding — two different roles gating one point in the flow. So `workflow_steps` doesn't carry a single `approver_role_id` column; instead each step `hasMany` `WorkflowStepApproverDef` rows (each either a role or a specific user). `ApproverResolver` flattens all of a step's definitions into one deduplicated list of concrete users; `approval_type` (`single`/`all`) then decides whether *any one* of that resolved list settles the step, or *all* of them must act.

### Condition evaluation is a pluggable Strategy, not an if/else chain

`ConditionEvaluator` holds a map of operator name → `ConditionOperator` implementation (`EqualsOperator`, `GreaterThanOperator`, `InOperator`, ...). Adding a new operator means adding one class, not editing the evaluator. Conditions are stored as JSON on `workflow_steps.conditions`: `[{"field": "amount", "operator": "greater_than", "value": 10000}]`, evaluated against the request's own JSON `data` payload — combined with AND semantics (see trade-offs for the OR/nesting limitation).

### The engine is a state machine over `RequestStep` / `RequestStepApprover`

`RequestEngine::submit()` walks a workflow version's steps in order, skipping any whose conditions don't match, and activates the first one that does — creating a `RequestStep` (the step *instance* for this request) and one `RequestStepApprover` row per resolved approver. `recordDecision()` looks up the caller's row on the currently active step, applies the decision, and either finalizes the request (reject/return) or checks whether the step's `approval_type` is now satisfied before advancing to the next matching step. Nothing here branches on which *workflow* is running — the same code drives every workflow an admin defines.

### Delegation

`User::activeDelegate()` checks for a delegation covering "now" whenever a step activates. `ApproverResolver` substitutes the delegate transparently, but keeps `acting_for_user_id` set on the `RequestStepApprover` row, so every approval action is traceable back to whose authority was actually exercised — satisfying "delegated approvals should be fully traceable" without a separate delegation-log table.

### Audit trail immutability

`RequestAuditLog` has no `updated_at` and its model refuses `updating`/`deleting` events outright (throws `LogicException`), so "audit records must not be editable" is enforced in code, not just by convention. In a production deployment with a dedicated DB role, I'd also revoke `UPDATE`/`DELETE` grants on that table at the database level as a second layer.

### Notifications

Implementation is left to the developer's discretion per the brief. I chose **in-app notifications only** (a plain `notifications` table + `NotificationService::notify()`), fired synchronously inside the same transaction as the state change they describe. This is the simplest thing that satisfies "generate a notification whenever X happens" without pulling in mail/queue infrastructure. `NotificationService` is a natural seam for adding an email/Slack channel later without touching any call site.

### Authentication

Laravel Sanctum, token-based (`Authorization: Bearer <token>`) — appropriate for a pure JSON API with no first-party SPA session to protect.

## Trade-offs & limitations

- **Conditions are AND-only, one level deep.** `[{...}, {...}]` all must match; there's no OR or nested grouping. Extending `ConditionEvaluator::evaluate()` to accept a small AST (`{"and": [...]}` / `{"or": [...]}`) is a contained change if that's needed later — I kept the flat form for this submission since every example in the brief is expressible as a flat AND list.
- **Delegation is resolved once, at step-activation time.** If a delegation starts *after* a step is already active and pending, that in-flight step won't retroactively reroute to the new delegate (the originally-resolved approver's pending row still stands). A background sweep or resolving lazily-at-decision-time would close this gap; I judged it an acceptable scope cut for the time available.
- **No email/SMS notification channel** — see "Notifications" above. `NotificationService` is the extension point.
- **Hard delete is intentionally unavailable for `Workflow`.** Only `is_active` toggling and versioning are exposed, to avoid orphaning historical requests that reference a version transitively owned by a deleted workflow.
- **Automated tests run against SQLite in-memory**, not Postgres, for speed and to avoid every CI/local run depending on network access to a remote database. None of the code under test is Postgres-specific — the one place that *is* (`NeonPostgresConnection`, see below) is a connection-level concern with no business logic in it, so this is a safe substitution, not a coverage gap.
- **Neon connection workarounds** (Windows-specific): this was built and demoed against a PHP install with an old bundled `libpq`. Two things had to be worked around and are both documented inline in `config/database.php` / `app/Database/NeonPostgresConnection.php`:
  1. Neon's pooled endpoint routes by SNI, which the old `libpq` can't do — worked around by appending `;options=endpoint=<id>` to the connection string (`DB_NEON_ENDPOINT` in `.env`).
  2. That same old `libpq`, combined with Neon's pooler, doesn't reliably support server-side prepared statements reused across statements in one transaction (confirmed via isolated testing — not a transient issue). Fixed by forcing PDO's emulated prepares, which in turn required a small custom `PostgresConnection` subclass to keep boolean columns binding correctly (emulated prepares otherwise send PHP booleans as bare integer literals, which Postgres — unlike MySQL/SQLite — won't implicitly cast for a real boolean column).

  Neither workaround is needed on a standard Linux deployment with a current `libpq`; they're isolated entirely to the `pgsql` connection config and don't affect application code.

## Deliverables checklist

- [x] Source code
- [x] Database migrations (`database/migrations/`)
- [x] [API documentation](docs/API.md)
- [x] [Database schema](docs/SCHEMA.md)
- [x] This README (setup, assumptions, architecture, trade-offs)
