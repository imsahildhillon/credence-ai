import { z } from 'zod';

import type { AiUsage } from '@/lib/ai/client';
import type { Database } from '@/lib/supabase/types';

/**
 * Types and the LLM output contract for the skill-assessment engine.
 *
 * (CLAUDE.md §4 would normally put Zod schemas in `schemas.ts`; this module's
 * file layout is fixed by the assessment-engine spec, so the output contract
 * lives here alongside the types it produces. There is still exactly one
 * definition of the shape.)
 */

export type AssessmentLevel = Database['public']['Enums']['assessment_level'];
export type ConfidenceLevel = Database['public']['Enums']['confidence_level'];
export type EvidenceSourceType = Database['public']['Enums']['evidence_source_type'];

/**
 * Engineering dimensions — the buckets normalized evidence is grouped into
 * before the model sees it.
 *
 * Dimensions are an *input-shaping* concept, not an output vocabulary. The
 * assessed vocabulary is the fixed 12-entry `skills` taxonomy (PRD FR-5.1,
 * "no free-form skills"), and each taxonomy skill declares which dimensions
 * feed it. Keeping the two separate is what lets us summarize evidence along
 * natural engineering lines without inventing skills the product does not
 * recognize.
 */
export const ENGINEERING_DIMENSIONS = [
  'code_quality',
  'collaboration',
  'architecture',
  'testing',
  'delivery',
  'ownership',
  'documentation',
  'debugging',
  'performance',
  'security',
  'leadership',
] as const;

export type EngineeringDimension = (typeof ENGINEERING_DIMENSIONS)[number];

/**
 * One citable piece of evidence, reduced to what a judgement legitimately
 * needs. `id` is the *only* token the model may cite, and it is the real
 * `evidence_items.id` — so every citation is verifiable against the row it
 * names.
 *
 * Deliberately absent: the candidate's name, GitHub handle, institution,
 * avatar, and any free-form body text. §17.10 requires the model be unable
 * to be biased by data it never receives, so authorship is reduced to a
 * boolean rather than a handle.
 */
export interface EvidenceReference {
  readonly id: string;
  readonly kind: EvidenceSourceType;
  readonly title: string;
  readonly repository: string;
  readonly occurredAt: string | null;
  readonly authoredByCandidate: boolean;
  /** Short structural descriptor (e.g. "+120/-34 across 4 files"), or null when unknown. */
  readonly detail: string | null;
}

export interface DimensionSummary {
  readonly dimension: EngineeringDimension;
  readonly evidenceCount: number;
  readonly repositoriesRepresented: number;
  /** Days between the earliest and latest dated signal; null when undated. */
  readonly activitySpanDays: number | null;
  readonly signalCounts: Readonly<Partial<Record<EvidenceSourceType, number>>>;
  /** Capped, most-recent-first sample the model may cite from. */
  readonly evidence: readonly EvidenceReference[];
}

export interface SkillBrief {
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly dimensions: readonly EngineeringDimension[];
}

export interface PortfolioSummary {
  readonly repositoryCount: number;
  readonly primaryLanguages: readonly string[];
  readonly totalEvidenceCount: number;
  readonly firstActivityAt: string | null;
  readonly lastActivityAt: string | null;
  /** Repositories excluded from this run, so the model can hedge honestly. */
  readonly repositoriesWithErrors: number;
}

/** The complete, PII-free payload handed to the model. No database rows. */
export interface AssessmentInput {
  readonly portfolio: PortfolioSummary;
  readonly dimensions: readonly DimensionSummary[];
  readonly skills: readonly SkillBrief[];
  /** Every id the model is permitted to cite, for membership validation. */
  readonly citableEvidenceIds: ReadonlySet<string>;
}

/**
 * The model's output contract.
 *
 * Built per run so `skillSlug` is constrained to the taxonomy actually loaded
 * from the database — the schema cannot drift from the seeded skills, and the
 * model cannot emit a slug that does not exist.
 *
 * `confidence` is a 0–1 number here and *only* here: it is the model's graded
 * self-report, used to derive the `confidence_level` band that is stored and
 * shown. No numeric score ever reaches the database or the UI (PRD FR-5.2,
 * Brand Guidelines §16.3).
 */
export function buildAssessmentOutputSchema(skillSlugs: readonly string[]) {
  const [first, ...rest] = skillSlugs;
  if (first === undefined) {
    throw new Error('Cannot build an assessment schema with an empty skill taxonomy.');
  }

  return z.strictObject({
    overallSummary: z
      .string()
      .min(1)
      .max(1200)
      .describe(
        'Two to four sentences describing what this portfolio of evidence shows, in plain language. No praise, no verdicts about the person.',
      ),
    assessments: z
      .array(
        z.strictObject({
          skillSlug: z.enum([first, ...rest]).describe('The skill being assessed.'),
          level: z
            .enum(['strong', 'developing', 'not_yet_assessed'])
            .describe(
              'strong: the evidence clearly demonstrates this skill. developing: partial or early evidence. not_yet_assessed: the evidence you were given cannot support a judgement.',
            ),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe(
              'How confident you are in this assessment given the quantity, recency, and directness of the evidence. Little evidence must produce a low number.',
            ),
          summary: z
            .string()
            .min(1)
            .max(700)
            .describe(
              'One to three sentences explaining the assessment by reference to the cited evidence.',
            ),
          strengths: z
            .array(z.string().min(1).max(240))
            .max(4)
            .describe('Specific observations about the evidence. Empty if none are supported.'),
          growthAreas: z
            .array(z.string().min(1).max(240))
            .max(4)
            .describe(
              'Specific gaps visible in the evidence, phrased as opportunities. Empty if none are supported.',
            ),
          evidenceIds: z
            .array(z.string().min(1))
            .min(1)
            .max(20)
            .describe(
              'Evidence ids from the provided evidence that support this assessment. Every id must appear verbatim in the input. Never invent an id.',
            ),
        }),
      )
      .min(1),
  });
}

export type AssessmentOutput = z.infer<ReturnType<typeof buildAssessmentOutputSchema>>;
export type RawSkillAssessment = AssessmentOutput['assessments'][number];

/** One assessment, validated and mapped into the shapes the database accepts. */
export interface PersistableAssessment {
  readonly skillSlug: string;
  readonly level: AssessmentLevel;
  readonly confidence: ConfidenceLevel;
  readonly reasoning: string;
  readonly strengths: readonly string[];
  readonly growthAreas: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface AssessmentRunSummary {
  readonly analysisId: string;
  readonly status: Database['public']['Enums']['analysis_status'];
  readonly skillsAssessed: number;
  readonly evidenceConsidered: number;
  readonly model: string | null;
  readonly promptVersion: string;
  readonly pipelineVersion: string;
  /** Present only on a run that actually called the model (CLAUDE.md §17.13). */
  readonly usage?: AiUsage;
}
