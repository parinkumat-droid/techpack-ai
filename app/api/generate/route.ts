import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { AiTechPackSchema } from "@/lib/aiSchema";
import { FITS, GARMENTS, SIZES, type TechPackInput } from "@/lib/garments";
import { buildSpecTable, checkMeasurement } from "@/lib/specRules";

// Vercel serverless functions reject request bodies over 4.5 MB.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash",
  process.env.GEMINI_FALLBACK_MODEL || "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];
// Gemini sometimes answers "high demand" or hangs; give each model a short
// deadline so a second model can still answer before the function times out.
const ATTEMPT_TIMEOUTS_MS = [30_000, 30_000, 40_000];

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are an experienced technical designer at an apparel factory in India, helping a small fashion brand write a tech pack.

You receive a garment sketch or photo plus facts from the brand. Write the technical content a designer would write: a short garment description, construction and stitching notes, a bill of materials (BOM) for everything except the main fabric, and a checklist of details a factory is likely to ask about.

Rules:
- BOM: list each trim, label, secondary fabric (rib, lining, interlining) and packaging item as a row with category (Trim, Label, Fabric, Packaging or Thread), item, specification, placement, colour and quantity per garment. Do not list the main fabric: the brand already gave it. Use "TBC" for any colour, size or quantity you cannot tell from the image or the facts, and write quantities as estimates, for example "1 pc" or "approx. 45 cm".
- Do not output any measurements. The spec table is built separately from the brand's own numbers.
- Only describe what you can see or what the brand told you. If the image does not show something (for example the neckline finish, hem or print), do not guess: add a question to missingDetails instead.
- Use standard factory terms (overlock, coverstitch, flatlock, bartack, binding) and name the thread, stitch type and finish where the garment type calls for it. Suggested values are drafts for the brand to verify.
- Keep each note short and specific enough for a sewing operator.
- Set imageMatchesGarmentType to false if the image clearly shows a different kind of garment than the one selected.
- missingDetails should be 4 to 8 concrete questions, such as colour or Pantone codes, print or label placement, neck label content, packaging.`;

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return fail(
      "The server has no GEMINI_API_KEY. Add it to .env.local (or Vercel environment variables).",
      500,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Could not read the upload. Please try again.");
  }

  const image = form.get("image");
  if (!(image instanceof File)) return fail("Please upload a sketch or photo.");
  if (!IMAGE_TYPES.includes(image.type as ImageType))
    return fail("Image must be a JPG, PNG or WebP file.");
  if (image.size > MAX_IMAGE_BYTES)
    return fail("Image is over 4 MB. Please use a smaller one.");

  let input: TechPackInput;
  try {
    input = JSON.parse(String(form.get("input")));
  } catch {
    return fail("The form details were not readable.");
  }

  const garment = GARMENTS[input?.garmentType];
  if (!garment) return fail("Choose one of the listed garment types.");
  if (
    !FITS.includes(input.fit) ||
    !SIZES.includes(input.sizeFrom) ||
    !SIZES.includes(input.sizeTo) ||
    !SIZES.includes(input.baseSize) ||
    typeof input.fabric !== "string" ||
    !input.fabric.trim() ||
    input.fabric.length > 200
  )
    return fail("Some form details are missing or invalid.");

  const from = SIZES.indexOf(input.sizeFrom);
  const to = SIZES.indexOf(input.sizeTo);
  const base = SIZES.indexOf(input.baseSize);
  if (from > to || base < from || base > to)
    return fail("Check the size range and base size.");

  for (const m of garment.measurements) {
    const problem = checkMeasurement(
      input.garmentType,
      m.key,
      Number(input.measurements?.[m.key]),
    );
    if (problem) return fail(problem);
  }

  const specTable = buildSpecTable(input);
  const imageData = Buffer.from(await image.arrayBuffer()).toString("base64");

  const facts = [
    `Garment: ${garment.label}`,
    `Components to look for (only describe the ones you can see; ask about the rest): ${garment.components}`,
    `Fit: ${input.fit}`,
    `Fabric: ${input.fabric.trim()}`,
    `Size range: ${input.sizeFrom} to ${input.sizeTo} (base size ${input.baseSize})`,
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const request = (model: string, timeoutMs: number) =>
      ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.type, data: imageData } },
              { text: `Write the tech pack content for this garment.\n\n${facts}` },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(AiTechPackSchema),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });

    let response: Awaited<ReturnType<typeof request>> | undefined;
    let lastError: unknown;
    for (const [i, model] of MODELS.entries()) {
      try {
        response = await request(model, ATTEMPT_TIMEOUTS_MS[i]);
        break;
      } catch (error) {
        lastError = error;
        const retryable =
          !(error instanceof ApiError) ||
          [429, 500, 503, 504].includes(error.status);
        console.error(`Gemini attempt failed (${model})`, error instanceof Error ? error.message : error);
        if (!retryable) throw error;
      }
    }
    if (!response) throw lastError;

    if (response.promptFeedback?.blockReason)
      return fail("The AI could not process this image. Try a different sketch or photo.", 422);

    const parsed = AiTechPackSchema.safeParse(
      JSON.parse(response.text ?? "null"),
    );
    if (!parsed.success) {
      console.error("Unexpected AI output", parsed.error.issues);
      return fail("The AI returned an unreadable answer. Please try again.", 502);
    }

    return Response.json({ input, specTable, ai: parsed.data });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Gemini API error", error.status, error.message);
      if (error.status === 429 || error.status === 503)
        return fail("The AI is busy right now. Please try again in a minute.", 429);
      if (error.status === 401 || error.status === 403 || error.status === 400)
        return fail("The Gemini API key was rejected or the request was invalid. Check GEMINI_API_KEY.", 500);
      return fail("The AI request failed. Please try again.", 502);
    }
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
      return fail("The AI took too long to answer. Please try again.", 504);
    if (error instanceof SyntaxError)
      return fail("The AI returned an unreadable answer. Please try again.", 502);
    console.error(error);
    return fail("Something went wrong. Please try again.", 500);
  }
}
