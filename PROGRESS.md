# Progress log

## 2026-10-22
- Wrote the MVP scope (problem, interviews, architecture, limitations).
- Set up the dev environment (Node.js, git, GitHub CLI).
- Scaffolded the Next.js app and created this repository.
- Built the input page: sketch/photo upload with preview, garment type (tee or joggers), fit, fabric, size range, base size and key measurements, with validation. Works at phone width. The AI step is not connected yet.
- Added the server route `/api/generate`: it validates the upload and form, builds the spec table from hard-coded tee and jogger grading rules (base-size values come from the user), and asks Claude (vision) for the description, construction notes, trims and a missing-details checklist as structured JSON. The key is read from an environment variable.
- Added a read-only tech pack view with a "verify before sending to the factory" banner. Not yet tested with a real API key.
