# Taskflow Pro

A gamified task management application with AI-powered workflows, RPG progression, and role-based dashboards.

## Stack

- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **AI:** xAI Grok API
- **Deploy:** Vercel

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # Fill in your keys
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `XAI_API_KEY`
