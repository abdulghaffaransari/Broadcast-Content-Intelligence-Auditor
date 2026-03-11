# Broadcast Content Intelligence Auditor — Frontend

Enterprise audit dashboard for Content Compliance Analysts, Broadcast Standards reviewers, and Brand Safety teams. Built with Next.js, TypeScript, and Tailwind.

## Prerequisites

- **Node.js** 18+ and **npm** (or yarn/pnpm)
- Backend API running at `http://localhost:8000` (see project root README)

## Setup

```bash
cd frontend
npm install
```

Optional: copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if your API runs elsewhere.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Audit Dashboard** to enter a YouTube URL, run an audit (sync or async), and view risk summary, sections, evidence, and recommendations. Export reports as **TXT**, **JSON**, or **PDF** via the Export dropdown. **Audit History** lists recent audits stored in this browser.

## Build

```bash
npm run build
npm start
```

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- date-fns
- jsPDF (PDF export)
