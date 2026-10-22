# Progress log

## 2026-10-22
- Wrote the MVP scope (problem, interviews, architecture, limitations).
- Set up the dev environment (Node.js, git, GitHub CLI).
- Scaffolded the Next.js app and created this repository.
- Built the input page: sketch/photo upload with preview, garment type (tee or joggers), fit, fabric, size range, base size and key measurements, with validation. Works at phone width. The AI step is not connected yet.
- Added the server route `/api/generate`: it validates the upload and form, builds the spec table from hard-coded tee and jogger grading rules (base-size values come from the user), and asks Gemini (vision, gemini-3.8-flash) for the description, construction notes, trims and a missing-details checklist as structured JSON. The key is read from an environment variable.
- Added a read-only tech pack view with a "verify before sending to the factory" banner. Not yet tested with a real API key.
- Switched the AI step from Claude to Gemini (gemini-3.8-flash; the older gemini-2.5-flash is closed to new keys). Tested end to end with a sample tee sketch: structured output came back in about 48 seconds and the page rendered the spec table, construction notes, trims and missing-details list.
- Made the whole tech pack editable on screen (style name, description, fit, fabric, every spec value and tolerance, construction notes, trims, and the missing-details checklist, with add and remove).
- Added PDF export (built in the browser, A4): sketch, details, spec table, notes, trims and checklist, with a "verify before sending to the factory" banner and footer on every page. Checked that edits show up in the PDF and that the page does not scroll sideways at phone width.
- Deployed to Vercel: https://techpack-ai-silk.vercel.app. The Gemini key is stored as a Vercel environment variable, not in GitHub. Tested the live link with the sample tee sketch: it returned a full pack in about 19 seconds.
- Fixed "something went wrong" on the live site: Gemini was sometimes overloaded (503) or hanging until Vercel timed out. The route now has a deadline per attempt, tries up to three Gemini models in turn, uses lower thinking effort, and shows a clear "AI is busy, try again" message.
