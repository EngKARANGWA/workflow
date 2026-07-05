# API Documentation

Base URL: `/api`. All request/response bodies are JSON. Authenticated endpoints require `Authorization: Bearer <token>`.

## Conventions

- **Auth**: obtained from `POST /api/auth/login` or `/api/auth/register`, a Sanctum personal access token.
- **Errors**: `422` for validation failures (`{"message": ..., "errors": {"field": ["..."]}}`), `401` unauthenticated, `403` authorization failure, `404` missing resource, `409` conflict (e.g. double-voting on a step), `422` also used for workflow business-rule violations (e.g. acting on a request with no active step).
- **Pagination**: list endpoints return Laravel's standard paginator shape (`data`, `current_page`, `per_page`, `total`, ...). Override page size with `?per_page=`.

---

## Authentication

### `POST /api/auth/register`

Public. Always creates a **Requester** account.

```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123", "password_confirmation": "secret123" }

// 201 Response
{ "user": { "id": 1, "name": "Jane Doe", "system_role": "requester", ... }, "token": "1|abc..." }
```

### `POST /api/auth/login`

Public.

```json
{ "email": "jane@example.com", "password": "secret123" }
```
→ `200` `{ "user": {...}, "token": "..." }`, or `422` on bad credentials.

### `POST /api/auth/logout`

Auth required. Revokes the current token.

### `GET /api/auth/me`

Auth required. Returns the current user (with their business `roles`).

---

## User management (admin only)

All routes below require `system_role = system_administrator`.

### `GET /api/users?system_role=&per_page=`

List users, optionally filtered by system role.

### `POST /api/users`

```json
{
  "name": "Manager Mike",
  "email": "manager@example.com",
  "password": "secret123",
  "system_role": "approver",
  "department": "Engineering",
  "employee_level": "Manager",
  "country": "Rwanda",
  "role_ids": [4]
}
```

`role_ids` assigns *business* roles (see `GET /api/roles`) used for workflow step routing — distinct from `system_role`.

### `GET /api/users/{id}` · `PUT /api/users/{id}` · `DELETE /api/users/{id}`

Standard CRUD. `PUT` accepts the same fields as `POST`, all optional; `role_ids` (if present) replaces the user's business roles.

---

## Business roles (admin only)

Roles used purely for step routing (Finance, Legal, CEO, ...) — not to be confused with `system_role`.

- `GET /api/roles` — list all
- `POST /api/roles` — `{ "name": "Finance", "description": "..." }`
- `DELETE /api/roles/{id}`

---

## Workflow management

### `GET /api/workflows?is_active=&per_page=`

Auth required (any role). Lists workflows with their current version.

### `GET /api/workflows/{id}`

Auth required. Full detail: all versions, each with its steps and approver definitions.

### `POST /api/workflows` (admin only)

Creates a workflow **and** its first version (`version_number: 1`) atomically.

```json
{
  "name": "Purchase Request",
  "description": "Standard purchase approval flow",
  "steps": [
    {
      "approval_type": "single",
      "approvers": [{ "approver_type": "role", "role_id": 4 }]
    },
    {
      "approval_type": "all",
      "conditions": [{ "field": "amount", "operator": "greater_than", "value": 10000 }],
      "approvers": [
        { "approver_type": "role", "role_id": 1 },
        { "approver_type": "role", "role_id": 2 }
      ]
    }
  ]
}
```

- `steps` is ordered — array index (+1) becomes `step_order`.
- `approval_type`: `single` (first approval settles the step) or `all` (every resolved approver must approve).
- `conditions` (optional): array of `{ "field", "operator", "value" }`, AND-combined, evaluated against the request's `data` payload at runtime. A step with no conditions always applies. Supported operators: `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `in`.
- Each entry in `approvers` is either `{ "approver_type": "role", "role_id": N }` or `{ "approver_type": "user", "user_id": N }`. Multiple entries on one step (as in the example above) implement parallel/multi-role approval gates.

### `PUT /api/workflows/{id}` (admin only)

Updates workflow **metadata only** (`name`, `description`, `is_active`) — never steps. To change steps, publish a new version.

### `POST /api/workflows/{id}/versions` (admin only)

Publishes a new version (same `steps` shape as creation). The previous version is marked non-current but left untouched; any request still referencing it is unaffected.

### `GET /api/workflows/{id}/versions` (admin only)

Lists every version of a workflow with its steps, for audit/history purposes.

---

## Requests

### `POST /api/requests`

Submit a request against a workflow's **current** version. Any authenticated user.

```json
{ "workflow_id": 1, "title": "New laptop", "data": { "amount": 15000, "department": "Engineering" } }
```

`data` is a free-form JSON payload — its keys are whatever a given workflow's conditions reference (amount, department, employee_level, country, ...). The engine automatically determines and activates the first applicable step.

### `GET /api/requests?scope=&per_page=`

- `scope=mine` (default) — requests you submitted.
- `scope=pending_my_approval` — requests currently awaiting **your** decision.
- `scope=all` — every request (admin only).

### `GET /api/requests/{id}`

Full detail (steps, each step's approvers and their decisions). Accessible to the requester, any assigned approver (past or present) on the request, or an admin.

### `GET /api/requests/{id}/history`

The complete, immutable audit trail for the request: every action, actor, timestamp, previous/new status, and comments.

### `POST /api/requests/{id}/decide`

Record an approval decision on the request's currently active step. Only usable by a user the engine has actually resolved as an approver for that step (directly, or as an active delegate).

```json
{ "decision": "approved", "comments": "Looks good" }
```

`decision`: `approved` | `rejected` | `returned`.

- `approved` on a `single` step, or the last outstanding approver on an `all` step, advances the request to the next applicable step (or to `approved` if none remain).
- `approved` on an `all` step with other approvers still pending records the vote and leaves the step active.
- `rejected` or `returned` from **any** required approver ends that step immediately (`rejected` fails the whole request; `returned` sends it back to the requester).

Errors: `403` if you're not an approver for the active step, `409` if you already acted on it, `422` if the request has no active step to decide on.

### `POST /api/requests/{id}/resubmit`

Only the original requester, only on a `returned` request.

```json
{ "data": { "amount": 15000, "justification": "Needed for onboarding" } }
```

Updates the request's data and reactivates the step that returned it, notifying the same approvers again.

---

## Delegations

Approver/admin only.

### `GET /api/delegations`

Delegations you've given or received.

### `POST /api/delegations`

```json
{ "delegate_id": 5, "starts_at": "2026-07-01T00:00:00Z", "ends_at": "2026-07-10T00:00:00Z" }
```

The delegate must themselves hold `approver` or `system_administrator`. While active, any step that would have routed to you routes to your delegate instead — traceable via `acting_for_user_id` on the resulting `RequestStepApprover` record.

### `DELETE /api/delegations/{id}`

Only the delegator or an admin can revoke.

---

## Notifications

### `GET /api/notifications?per_page=`

Your in-app notifications, newest first.

### `POST /api/notifications/{id}/read`

Marks one of your notifications as read.
