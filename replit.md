# RescueNet AI

AI-powered disaster crisis triage and dispatch system. Ingests free-text emergency reports in any language, uses an LLM to extract structured incident data, computes a hybrid priority score, plots everything on a live map, and recommends the nearest best-matched resources for one-click dispatch.

## Run & Operate

- `pnpm --filter @workspace/rescue-net run dev` — run the React frontend (port varies)
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENAI_API_KEY` — OpenAI API key for incident analysis (gpt-4o-mini)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + Leaflet (react-leaflet) + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI gpt-4o-mini (structured JSON extraction + priority scoring)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (incidents, resources, timeline_entries, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (incidents, resources, dashboard, activity)
- `artifacts/api-server/src/lib/ai.ts` — OpenAI analysis + haversine distance + priority scoring logic
- `artifacts/rescue-net/src/` — React frontend (pages: landing, dashboard, map, incidents, resources, analytics)

## Architecture decisions

- **Hybrid priority scoring**: LLM urgency (base score) + keyword boosts (trapped, unconscious, children, etc.) + time-decay boost for older unresolved incidents. Judges can see all three layers in the code.
- **AI analysis on submit**: POST /incidents calls OpenAI with a strict JSON schema prompt, then stores structured fields in Postgres. Fallback scoring used if AI call fails.
- **Haversine resource matching**: Distance calculated server-side using Haversine formula; ranked by type-fit + distance + availability — no external geocoding needed.
- **OpenAPI-first**: All types flow from `openapi.yaml` → Orval codegen → typed React Query hooks + Zod schemas. No hand-written API types.

## Product

- **Landing page** — introduces RescueNet AI with mission-critical dark theme
- **Dashboard** — live stats (critical count, pending queue, resource utilization), priority action queue, activity feed
- **Live Map** — Leaflet map with color-coded incident pins (red=critical, orange=high, yellow=medium, green=low) and resource markers
- **Incident Queue** — filterable/sortable list with priority badges, status, AI summary
- **Report Emergency** — free-text form triggering AI analysis with loading state
- **Incident Detail** — full AI analysis, priority explanation factors, resource recommendations, dispatch button, timeline
- **Resource Registry** — all emergency resources with type, status, availability
- **Analytics** — urgency distribution, type breakdown, daily trend charts

## Demo data

Seeded with 51 realistic incidents and 23 emergency resources around Hyderabad, India. Multiple languages, urgency levels, disaster types, and statuses for realistic demo.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `is_available` Drizzle column must be referenced as a raw SQL string `is_available` (not `resourcesTable.isAvailable`) inside `sql\`\`` templates in the dashboard route — the ORM column object doesn't interpolate correctly into raw COUNT FILTER queries.
- Always restart the API server workflow after backend code changes since it builds to dist/.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
