import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiTechPackSchema } from "@/lib/aiSchema";
import { FITS, GARMENTS, SIZES, type TechPackInput } from "@/lib/garments";
import { buildSpecTable, checkMeasurement } from "@/lib/specRules";

// Vercel serverless functions reject request bodies over 4.5 MB.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are an experienced technical designer at an apparel factory in India, helping a small fashion brand write a tech pack.

You receive a garment sketch or photo plus facts from the brand. Write the technical content a designer would write: a short garment description, construction and stitching notes, a bill of trims, and a checklist of details a factory is likely to ask about.

Rules:
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      "The server has no ANTHROPIC_API_KEY. Add it to .env.local (or Vercel environment variables).",
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
    return fail("Image must be a JPG, PNG, GIF or WebP file.");
  if (image.size > MAX_IMAGE_BYTES)
    return fail("Image is over 4 MB. Please use a smaller one.");

  let input: TechPackInput;
  try {
    input = JSON.parse(String(form.get("input")));
  } catch {
    return fail("The form details were not readable.");
  }

  const garment = GARMENTS[input?.garmentType];
  if (!garment) return fail("Choose tee or joggers. Other garments are not supported yet.");
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
    `Fit: ${input.fit}`,
    `Fabric: ${input.fabric.trim()}`,
    `Size range: ${input.sizeFrom} to ${input.sizeTo} (base size ${input.baseSize})`,
  ].join("\n");

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(AiTechPackSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.type as ImageType,
                data: imageData,
              },
            },
            { type: "text", text: `Write the tech pack content for this garment.\n\n${facts}` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal")
      return fail("The AI could not process this image. Try a different sketch or photo.", 422);
    if (!response.parsed_output)
      return fail("The AI returned an unreadable answer. Please try again.", 502);

    return Response.json({ input, specTable, ai: response.parsed_output });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      return fail("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 500);
    if (error instanceof Anthropic.RateLimitError)
      return fail("The AI is busy right now. Please try again in a minute.", 429);
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return fail("The AI request failed. Please try again.", 502);
    }
    console.error(error);
    return fail("Something went wrong. Please try again.", 500);
  }
}
