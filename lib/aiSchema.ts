import { z } from "zod";

// What the AI returns. Measurements are NOT in here: they come from the user's
// input and the hard-coded spec rules, never from the model.
const Callout = z.object({
  label: z.string(),
  // Where the feature sits on the image, as a fraction of its width / height
  // measured from the top-left corner.
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const AiTechPackSchema = z.object({
  garmentDescription: z.string(),
  designSummary: z.string(),
  imageMatchesGarmentType: z.boolean(),
  frontCallouts: z.array(Callout),
  backCallouts: z.array(Callout),
  constructionNotes: z.array(z.object({ area: z.string(), detail: z.string() })),
  artwork: z.array(
    z.object({
      name: z.string(),
      technique: z.string(),
      placement: z.string(),
      size: z.string(),
      colour: z.string(),
    }),
  ),
  threads: z.array(
    z.object({
      description: z.string(),
      tex: z.string(),
      spi: z.string(),
      comment: z.string(),
    }),
  ),
  bom: z.array(
    z.object({
      category: z.string(),
      item: z.string(),
      specification: z.string(),
      placement: z.string(),
      colour: z.string(),
      quantity: z.string(),
    }),
  ),
  missingDetails: z.array(z.string()),
});

export type AiTechPack = z.infer<typeof AiTechPackSchema>;
export type AiCallout = z.infer<typeof Callout>;
