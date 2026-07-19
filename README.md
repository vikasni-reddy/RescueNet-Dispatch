# 🛡️ RescueNet AI

**AI-powered command center for emergency response teams.**
Report an emergency in plain text → AI triages it in seconds → operators dispatch the nearest resource → every step is tracked until resolution.

Built solo for **Idea2Impact Online Hackathon 2026** — Theme 3: *Crisis Management, HealthTech & Emergency Response*.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-4169E1?logo=postgresql&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Hackathon_Project-orange)

🔗 **Live App:** https://rescue-net-dispatch--vikasnireddypon.replit.app/
📦 **Repo:** https://github.com/vikasni-reddy/RescueNet-Dispatch

---

## ⭐ Key Highlights

- 🧠 AI-powered incident triage (GPT-4o-mini)
- 📊 Hybrid 0–100 priority scoring, fully explainable
- 🖥️ Live command center dashboard for operators
- 🚑 Smart, distance-ranked resource recommendations
- 🗺️ Interactive real-time tactical map
- 📈 Real-time analytics on severity, demand, and trends
- 🛟 Rule-based fallback triage if the AI service goes down

---

## 💡 Why This Project Matters

Every minute lost during an emergency can cost a life. Control rooms today triage reports manually, under pressure, with no consistent way to separate a critical case from a minor one until someone reads and judges each report by hand. **RescueNet AI helps emergency operators prioritize incidents, allocate the right resource, and cut response delays through AI-assisted decision support** — so the system does in seconds what used to take a stretched human team minutes to work through.

---

## 🚨 The Problem

When a disaster hits, the first few minutes decide outcomes — but most emergency reporting is still a phone call to an overloaded operator, or a form nobody has time to fill out correctly. Reports pile up with no consistent way to know which one is truly life-threatening, who's free to respond, or where they should go. Control rooms end up triaging by gut feeling and whoever shouts loudest, while critical cases sit in a queue next to minor ones.

**RescueNet AI** turns a single free-text distress message into a structured, prioritized, geographically-aware incident that a human operator can act on in seconds — not minutes.

---

## ⚙️ How It Works

1. **Report** — Anyone submits a free-text emergency description (what's happening, who's affected, where) through the public emergency form. No app install, no login.
2. **AI Triage** — The backend sends the raw text to **GPT-4o-mini**, which extracts urgency, need type (medical / fire / rescue / food / shelter / police), people affected, a clean summary, and a structured explanation of *why* it rated the incident that way.
3. **Hybrid Priority Scoring** — A deterministic scoring layer combines the AI's urgency classification with keyword risk-signal detection (e.g. "trapped," "unconscious," "children," "fire," "gas leak") and a time-decay factor, producing an auditable **0–100 priority score** — so scoring isn't a black box the AI alone controls.
4. **Live Dashboard & Map** — The incident instantly appears on the operator's Command Center dashboard and on a live Leaflet map, pinned at its reported location.
5. **Smart Dispatch Recommendations** — For each incident, the backend ranks all available resources (ambulances, fire trucks, food/medical teams) by type match, **haversine distance**, and ETA, and returns a ranked shortlist.
6. **One-Click Dispatch** — The operator assigns a resource with a single click. The resource's status updates in real time and is reflected across the queue, the map, and analytics.
7. **Full Incident Lifecycle** — Every state change (reported → AI-analyzed → pending → dispatched → en route → resolved) is timestamped on a per-incident timeline, so the entire response is auditable after the fact.
8. **Resilience** — If the OpenAI API is unavailable, the system automatically falls back to a rule-based **heuristic triage engine** (keyword + urgency-pattern matching) so incident intake never stops, even if the AI service is down — critical for a system that has to work under real-world failure conditions.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **AI-Driven Triage** | GPT-4o-mini reads free-text reports and extracts structured urgency, need type, and risk signals. |
| 📊 **Hybrid Priority Scoring** | 0–100 score = AI urgency base + keyword risk boosts + time-decay, fully explainable per incident. |
| 🗺️ **Live Tactical Map** | Real-time geospatial view of every open incident and every deployed resource (Leaflet + OpenStreetMap). |
| 🚑 **Smart Dispatch** | Ranks available units by type, haversine distance, and ETA to recommend the optimal resource. |
| 📋 **Incident Queue** | Searchable, filterable operator queue sorted by priority, urgency, or recency. |
| 🧰 **Resource Registry** | Live status board (available / en route / busy) for every ambulance, fire truck, and supply unit. |
| 📈 **Analytics** | Severity distribution, resource demand by type, and 7-day incident volume trends. |
| 🕒 **Full Audit Trail** | Every status change is timestamped and stored on an incident timeline. |
| 🛟 **Heuristic Fallback** | Rule-based triage keeps the system operational even if the AI service is unreachable. |

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client — React + Vite"]
        A["Public Emergency Form<br/>(citizen reports incident)"]
        B["Operator Command Center<br/>Dashboard · Live Map · Queue · Resources · Analytics"]
    end

    subgraph API["⚙️ API Server — Express 5 (Node/TypeScript)"]
        C["/incidents<br/>create · list · update"]
        D["/incidents/:id/recommendations<br/>ranked dispatch suggestions"]
        E["/resources<br/>manage units"]
        F["AI Triage Engine<br/>(lib/ai.ts)"]
        G["Realtime Broadcaster<br/>(SSE / live push)"]
    end

    subgraph AI["🧠 AI Layer"]
        H["OpenAI GPT-4o-mini<br/>urgency · need type · summary ·<br/>reasoning · required resources"]
        I["Heuristic Fallback Engine<br/>keyword + urgency pattern matching"]
        J["Hybrid Priority Scorer<br/>AI urgency base + keyword boosts<br/>+ time decay = 0–100 score"]
    end

    subgraph Data["🗄️ Data Layer — PostgreSQL + Drizzle ORM"]
        K[("incidents")]
        L[("resources")]
        M[("timeline")]
        N[("activity feed")]
    end

    A -->|"POST rawText, location"| C
    C --> F
    F -->|"analyze()"| H
    H -.->|"on failure"| I
    F --> J
    J --> C
    C --> K
    C --> M
    C --> N
    C -->|"broadcast new/updated"| G
    G -->|"live updates"| B

    B -->|"view incidents"| C
    B -->|"request dispatch options"| D
    D --> K
    D --> L
    D -->|"haversine distance + ETA ranking"| B
    B -->|"assign resource"| E
    E --> L
    E --> M

    style H fill:#2563eb,color:#fff
    style I fill:#475569,color:#fff
    style J fill:#0891b2,color:#fff
```

### Request flow — from report to dispatch

```mermaid
sequenceDiagram
    participant U as Citizen
    participant F as Frontend (React)
    participant S as API Server (Express)
    participant AI as GPT-4o-mini
    participant DB as PostgreSQL

    U->>F: Submit emergency description
    F->>S: POST /incidents { rawText, location }
    S->>DB: Insert incident (status: ai_processing)
    S->>AI: analyzeIncident(rawText)
    AI-->>S: urgency, needType, peopleAffected, summary, reasoning
    S->>S: computePriorityScore() → 0–100
    S->>DB: Update incident (priorityScore, status: pending)
    S->>DB: Log timeline event
    S-->>F: Broadcast incident:new (live)
    F-->>U: Tracking ID + confirmation
    Note over F,S: Operator opens Incident Queue
    F->>S: GET /incidents/:id/recommendations
    S->>DB: Fetch available resources
    S->>S: Rank by type match + haversine distance + ETA
    S-->>F: Ranked resource list
    F->>S: PATCH /incidents/:id { assignedResourceId }
    S->>DB: Update incident + resource status
    S->>DB: Log dispatch on timeline
```

---

## 🧱 Tech Stack

**Monorepo:** pnpm workspaces, TypeScript end-to-end

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), TanStack Query, Wouter (routing), React Hook Form + Zod |
| **Maps** | Leaflet + react-leaflet, OpenStreetMap tiles |
| **Charts** | Recharts |
| **Backend** | Node.js, Express 5, Pino (structured logging) |
| **AI** | OpenAI API — `gpt-4o-mini` for report analysis, with a deterministic heuristic fallback engine |
| **Database** | PostgreSQL, Drizzle ORM, Drizzle-Zod for schema validation |
| **API Contract** | OpenAPI spec (`lib/api-spec`) → Orval-generated, fully typed React Query hooks (`lib/api-client-react`) |
| **Realtime** | Server-Sent Events broadcaster for live dashboard updates |
| **Deployment** | Replit (build + hosting) |

### Monorepo layout

```
RescueNet-Dispatch/
├── artifacts/
│   ├── rescue-net/        # Main operator + citizen-facing frontend (React/Vite)
│   ├── api-server/        # Express API server + AI triage engine
│   └── mockup-sandbox/    # UI component sandbox
├── lib/
│   ├── db/                # Drizzle schema (incidents, resources, timeline, activity)
│   ├── api-spec/          # OpenAPI definition
│   ├── api-zod/           # Generated Zod validators
│   └── api-client-react/  # Generated typed React Query client
├── scripts/                # Dev/maintenance scripts
└── package.json            # Workspace root
```

---

## 🧪 AI Triage Logic — the core of the project

`artifacts/api-server/src/lib/ai.ts`

1. **Full AI mode:** raw incident text is sent to `gpt-4o-mini` with a structured prompt requesting urgency, need type, disaster type, people affected, a 2-sentence reasoning explanation, and required resource types — returned as strict JSON.
2. **Priority scoring:**
   - Base score from urgency tier (`critical=90, high=70, medium=45, low=20`)
   - **+ boost** for risk keywords detected in the raw text (trapped, unconscious, children, fire, flood, gas leak, earthquake, etc. — 13 weighted categories)
   - **+ boost** for people-affected count
   - **+ boost** for time decay (older unresolved reports climb the queue)
   - Capped at 100
3. **Heuristic fallback:** if the OpenAI call fails, a rule-based classifier using the same keyword library independently estimates urgency and need type — so the system degrades gracefully instead of failing.
4. **Dispatch ranking:** `haversineKm()` computes great-circle distance between an incident and every available resource of a matching type; `etaMinutes()` converts that into an estimated response time, and results are ranked to recommend the optimal unit.

---

## 🖥️ Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database (a Neon/Supabase/local Postgres instance all work)
- OpenAI API key

### Setup

```bash
# 1. Clone
git clone https://github.com/vikasni-reddy/RescueNet-Dispatch.git
cd RescueNet-Dispatch

# 2. Install dependencies (pnpm is required — the workspace enforces this)
pnpm install

# 3. Configure environment variables
# In artifacts/api-server/.env
DATABASE_URL=postgres://user:password@host:5432/dbname
OPENAI_API_KEY=sk-...

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. Run the API server
pnpm --filter @workspace/api-server run dev

# 6. In a separate terminal, run the frontend
pnpm --filter @workspace/rescue-net run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns) and will proxy API calls to the Express server.

### Build for production

```bash
pnpm run build
```

---

---

## 📍 Product Walkthrough

| Screen | What it shows |
|---|---|
| **Landing Page** | Product pitch, live stats (sub-2s AI analysis, max priority score 99), "Report Emergency" and "Launch Command Center" entry points |
| **Emergency Report Form** | Public, no-login form — free-text description, optional location and contact |
| **Command Center Dashboard** | Live counts (critical incidents, pending queue, active resources, resolved today) + priority action queue + live activity feed |
| **Live Map** | All incidents and resources plotted geospatially in real time |
| **Incident Queue** | Full sortable/filterable list with priority score, urgency badge, type, and status |
| **Resource Registry** | Every ambulance, fire truck, food/medical team with live status and one-click deploy |
| **Analytics** | Severity distribution, resource demand by type, 7-day incident trend, resolution rate |

---

## 🎯 Why This Approach

Most hackathon "AI" projects wrap a chatbot around a form. RescueNet AI's AI is load-bearing: the priority queue, the dispatch recommendations, and the operator's entire triage workflow are *driven by* the AI's structured output — not decorated with it. The hybrid scoring model (AI + deterministic keyword/time-decay layer) also means the system's decisions are explainable and auditable, which matters for a tool making life-and-safety recommendations — you can always answer "why was this incident ranked first?"

---

## 🔮 Future Roadmap

- Multi-language input support (auto-detect and translate non-English reports)
- SMS/USSD reporting channel for low-connectivity areas
- Real-time push notifications for operators and dispatched units
- Voice-based emergency reporting (speech-to-text intake)
- Predictive resource pre-positioning based on historical incident density
- Predictive disaster analytics (early-warning risk modeling by region)
- Offline-first reporting with sync-on-reconnect for disaster-hit connectivity
- Government/public-safety API integration (112/emergency services handoff)
- Role-based access for multiple operator agencies

---

## 👤 Author

Built solo by **Vikas Reddy** for the Idea2Impact Online Hackathon 2026 (NxtWave Academy).

