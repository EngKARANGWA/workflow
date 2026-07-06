# Dynamic Workflow & Approval Engine

A configurable, data-driven approval engine: administrators define workflows (steps, approvers, conditions) entirely through the API — no workflow logic is hardcoded anywhere in the application.

This is a monorepo with two parts:

| | |
|---|---|
| [`backend/`](backend/README.md) | The Laravel 12 / PHP 8.2 API — the actual challenge submission. Auth, workflow/user/role management, request processing, conditional routing, parallel approvals, delegation, audit trail, notifications. **Start here.** |
| [`frontend/`](frontend/README.md) | A Next.js UI on top of the API — not requested by the brief, included as a working end-to-end demonstration. |

## Quick start

```bash
cd backend && composer install && cp .env.example .env && php artisan key:generate
# edit backend/.env with your Postgres credentials, then:
php artisan migrate --seed && php artisan serve
```

```bash
cd frontend && npm install && cp .env.local.example .env.local && npm run dev
```

See [`backend/README.md`](backend/README.md) for full setup instructions, assumptions, architectural decisions, trade-offs, API docs, and the database schema — everything the challenge brief asks for lives there.
