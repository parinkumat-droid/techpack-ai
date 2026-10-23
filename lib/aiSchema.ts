import { z } from "zod";

// What Claude returns. Measurements are NOT in here: they come from the user's
// input and the hard-coded spec rules, never from the model.
export const AiTechPackSchema = z.object({
  garmentDescription: z.string(),
  imageMatchesGarmentType: z.boolean(),
  constructionNotes: z.array(z.object({ area: z.string(), detail: z.string() })),
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
