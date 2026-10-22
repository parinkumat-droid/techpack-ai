# TechPack AI

AI tech pack designer for small Indian fashion brands. Upload a garment sketch, fill a short form, get an editable draft tech pack and a PDF for the factory.

Built for the ForgeX AI Hackathon, Mesa School of Business (October 2026).

## Problem

Small fashion brands without an in-house technical designer spend 2-3 days and ₹1,000-3,000 per style on a tech pack, and every incomplete pack costs another 1-2 days.

## MVP journey

1. Upload a sketch or photo, then fill a short form (garment type, fabric, fit, size range, base-size measurements).
2. Claude drafts construction notes, trims and a "missing details" checklist; hard-coded spec rules build the spec table (tee and joggers only).
3. Review and edit on screen, then export a PDF marked "verify before sending to the factory".

Out of scope for the MVP: logins, saved packs, full size grading, costing.

## Stack

Next.js (App Router, TypeScript, Tailwind) on Vercel, with the Claude API called from a server route. The API key lives in an environment variable and is never committed.

## Run locally

```bash
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000.

See [PROGRESS.md](PROGRESS.md) for the build log.
