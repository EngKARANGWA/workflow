# Database Schema

All tables use bigint auto-incrementing primary keys and standard `created_at`/`updated_at` timestamps unless noted. Migrations live in `database/migrations/` and are the authoritative source — this is a narrative companion to them.

## Entity overview

```
users ──┬── role_user ──── roles
        │                    │
        │                    └── workflow_step_approver_defs (role_id)
        │
        ├── delegations (delegator_id / delegate_id)
        │
        ├── workflows.created_by
        ├── workflow_versions.created_by
        │
        ├── requests.requester_id
        ├── request_step_approvers.user_id / acting_for_user_id
        ├── request_audit_logs.user_id
        └── notifications.user_id

workflows ──< workflow_versions ──< workflow_steps ──< workflow_step_approver_defs
                    │
                    └──< requests ──< request_steps ──< request_step_approvers
                              │
                              ├──< request_audit_logs
                              └──< notifications
```

## Tables

### `users`

Login + profile. `system_role` (string enum: `system_administrator` / `approver` / `requester`) gates API permissions. `department`, `employee_level`, `country` are free-form profile fields — convenience data that gets merged into a request's condition-evaluation context when relevant (e.g. a condition on `country`).

### `roles` / `role_user`

Admin-managed **business** roles (Finance, Legal, CEO, Manager, ...) — a many-to-many with `users`. Deliberately separate from `system_role`: these exist purely so a workflow step can say "needs Finance approval" as data, not code.

### `workflows`

Logical container: `name`, `description`, `is_active`, `created_by`. Holds no steps directly.

### `workflow_versions`

`workflow_id`, `version_number` (unique per workflow), `is_current` (exactly one true per workflow at a time), `created_by`. Every edit to a workflow inserts a new row here rather than mutating an old one — this is the mechanism behind "editable without affecting in-progress requests."

### `workflow_steps`

`workflow_version_id`, `step_order` (unique per version), `approval_type` (`single` / `all`), `conditions` (nullable JSON array of `{field, operator, value}`). Does **not** store an approver directly — see below.

### `workflow_step_approver_defs`

One-to-many from `workflow_steps`. Each row is either `{approver_type: 'role', role_id}` or `{approver_type: 'user', user_id}`. A step can have several of these (e.g. one Finance + one Legal), which is what makes "both Finance and Legal must approve" expressible as a single step rather than requiring the engine to special-case multi-role gates.

### `requests`

One submitted instance of a workflow. `workflow_version_id` (the exact version it started under — **never** repointed), `requester_id`, `title`, `data` (JSON payload the requester submits; conditions evaluate against this), `status` (`in_progress` / `approved` / `rejected` / `returned`), `current_step_order`.

### `request_steps`

The per-request instance of a `workflow_step` as it's actually walked: `status` (`pending` / `active` / `approved` / `rejected` / `returned` / `skipped`), `started_at`, `completed_at`. A `skipped` row is still created (not omitted) when a step's conditions don't match, so the full path a request took is reconstructable.

### `request_step_approvers`

Who is actually on the hook for a given `request_step`, and their individual decision. `user_id` is always the *acting* person (could be a delegate); `acting_for_user_id` is set when that's the case, otherwise null. `decision`: `pending` / `approved` / `rejected` / `returned`. Unique on `(request_step_id, user_id)`.

### `delegations`

`delegator_id`, `delegate_id`, `starts_at`, `ends_at`. Checked live (`User::activeDelegate()`) whenever a step is being activated — see the README trade-offs for the "resolved once, not re-evaluated" limitation.

### `request_audit_logs`

Append-only. `request_id`, `user_id` (nullable — system-generated events like final completion have no actor), `action`, `previous_status`, `new_status`, `comments`, `created_at` only (no `updated_at`). The Eloquent model refuses update/delete at the application layer regardless of how they're attempted.

### `notifications`

`user_id` (recipient), `request_id`, `type` (`request_submitted` / `request_approved` / `request_rejected` / `request_returned` / `approval_pending`), `message`, `read_at`.

### `personal_access_tokens`

Standard Sanctum table for API token auth.

## Why JSON columns for `data` and `conditions`

Both are intentionally schemaless. `requests.data` varies per workflow (a Leave Request needs `start_date`/`end_date`; a Purchase Request needs `amount`/`vendor`) — a fixed relational schema for "the request payload" would either need a table per workflow type or a sparse universal table, both of which reintroduce the hardcoding the brief explicitly rules out. `workflow_steps.conditions` mirrors that: it's a small rule list interpreted by `ConditionEvaluator` at runtime, not a column-per-condition-type schema.
