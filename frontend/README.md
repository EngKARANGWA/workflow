# Workflow Engine — Frontend

A Next.js UI for the [Workflow & Approval Engine API](../README.md) — not part of the challenge brief, but included as a working demonstration of the engine end-to-end: auth, admin (users/roles/workflows), request submission and approval, delegations, and notifications.

## Setup

```bash
cd Frontend
npm install
cp .env.local.example .env.local   # or create it manually, see below
npm run dev
```

`.env.local` needs one variable, pointing at the backend API:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

The backend (see the [root README](../README.md)) must be running first — this app only talks to it over HTTP, it has no database access of its own.

Open [http://localhost:3000](http://localhost:3000). Log in with the seeded admin (`admin@workflow.test` / `password`) or register a new Requester account.

## Notes

- Built with the Next.js App Router, TypeScript, and Tailwind CSS.
- No component library or icon package — UI primitives and icons are hand-rolled in `src/components/`.
- Dark/light theme follows the OS preference automatically; the sidebar is intentionally always dark.
