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
- Tested the live site with real Fake Society Studio photos (a Project 001 tee and the track pants). Both returned full packs in about 5 seconds. Known gap: the AI sometimes states unseen details (hem allowance, stitch types) as facts, so every output stays marked "verify before sending to the factory".
- Added five more garment types (shirt, hoodie, jacket, shorts, jeans) to the existing tee and joggers, each with its own measurements, grading steps and tolerances. Tested all five on the live site; the "image may not show this garment" warning correctly fires when the photo does not match the chosen type.
- Added a Bill of Materials (BOM) sheet: the AI now lists trims, labels, secondary fabrics, thread and packaging with placement, colour and quantity per garment; the main fabric row comes from the user's own input. The BOM is editable on screen, printed in the PDF and downloadable as a CSV for Excel. Quantities are estimates marked for factory confirmation.
