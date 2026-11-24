import { z } from "zod";
import { TransformationMode } from "@/types/database";

export const TransformationOutputSchema = z.object({
  transformed_text: z.string().min(1, "Transformed text cannot be empty"),
  transformation_mode: z.enum(["faithful", "clean", "readable"]),
  prompt_version: z.string(),
  provider: z.string(),
  model: z.string(),
  context_references: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  validation_status: z.enum(["valid", "flagged_repetition", "flagged_divergence"]).default("valid"),
});

export type TransformationOutput = z.infer<typeof TransformationOutputSchema>;

export interface TransformationRequestParams {
  transcriptId: string;
  sourceRevisionId: string;
  sourceText: string;
  mode: TransformationMode;
  approvedContext: Array<{ id: string; name: string; type: string; detail: string }>;
  provider?: string;
  model?: string;
}
