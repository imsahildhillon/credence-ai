import type {
  AssessmentOutput,
  ConfidenceLevel,
  PersistableAssessment,
  RawSkillAssessment,
} from './types';

/**
 * Maps validated model output into the shapes the database accepts, and
 * rejects anything that fails the platform's own rules before it can be
 * written.
 *
 * Two conversions happen here, both deliberate.
 *
 * **Numeric confidence → domain band.** The model reports confidence as a
 * 0–1 number because a graded self-report is more useful than asking it to
 * pick a word. That number never leaves this module: it is banded into the
 * `confidence_level` enum (`high | moderate | preliminary`) that the schema,
 * the API, and the UI all speak. The product promises no numeric scores
 * anywhere (PRD FR-5.2, Brand Guidelines §16.3) and this is where that
 * promise is kept.
 *
 * **Evidence-count ceilings.** A model can be sincerely confident on the
 * strength of two commits. Calibration is ours to enforce, not the model's to
 * self-report, so the band is additionally capped by how much evidence the
 * assessment actually cites — no amount of model confidence can produce a
 * `high` band off three citations.
 */

const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MODERATE_CONFIDENCE_THRESHOLD = 0.45;

/** Citations required before a band is even reachable. */
const CITATIONS_FOR_HIGH = 8;
const CITATIONS_FOR_MODERATE = 3;

const CONFIDENCE_ORDER: readonly ConfidenceLevel[] = ['preliminary', 'moderate', 'high'];

function bandFromScore(score: number): ConfidenceLevel {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    return 'high';
  }
  if (score >= MODERATE_CONFIDENCE_THRESHOLD) {
    return 'moderate';
  }
  return 'preliminary';
}

function ceilingFromCitations(citationCount: number): ConfidenceLevel {
  if (citationCount >= CITATIONS_FOR_HIGH) {
    return 'high';
  }
  if (citationCount >= CITATIONS_FOR_MODERATE) {
    return 'moderate';
  }
  return 'preliminary';
}

export function toConfidenceLevel(score: number, citationCount: number): ConfidenceLevel {
  const reported = CONFIDENCE_ORDER.indexOf(bandFromScore(score));
  const ceiling = CONFIDENCE_ORDER.indexOf(ceilingFromCitations(citationCount));
  return CONFIDENCE_ORDER[Math.min(reported, ceiling)] ?? 'preliminary';
}

/** The weakest band present — an overall claim is only as good as its worst part. */
export function lowestConfidence(levels: readonly ConfidenceLevel[]): ConfidenceLevel {
  return levels.reduce<ConfidenceLevel>(
    (lowest, level) =>
      CONFIDENCE_ORDER.indexOf(level) < CONFIDENCE_ORDER.indexOf(lowest) ? level : lowest,
    'high',
  );
}

export interface RejectedAssessment {
  readonly skillSlug: string;
  readonly reason: string;
}

export interface MappedAssessments {
  readonly assessments: readonly PersistableAssessment[];
  readonly rejected: readonly RejectedAssessment[];
}

function toPersistable(
  raw: RawSkillAssessment,
  citedIds: readonly string[],
): PersistableAssessment {
  return {
    skillSlug: raw.skillSlug,
    level: raw.level,
    confidence: toConfidenceLevel(raw.confidence, citedIds.length),
    reasoning: raw.summary,
    strengths: raw.strengths,
    growthAreas: raw.growthAreas,
    evidenceIds: citedIds,
  };
}

/**
 * Validates every citation against the evidence actually supplied, before
 * anything is written.
 *
 * The database rejects hallucinated ids too (`persist_skill_assessment`), and
 * that is the guarantee that matters. This check exists so a fabricated
 * citation is caught as a *named product failure* — reported per skill, with
 * the offending ids — rather than surfacing as an opaque constraint violation
 * with no indication of which assessment was fabricated.
 *
 * An assessment citing any invalid id is dropped whole. Silently keeping its
 * valid citations would mean persisting a claim whose stated grounds are
 * partly fiction.
 */
export function mapAssessments(
  output: AssessmentOutput,
  citableEvidenceIds: ReadonlySet<string>,
): MappedAssessments {
  const assessments: PersistableAssessment[] = [];
  const rejected: RejectedAssessment[] = [];
  const seenSlugs = new Set<string>();

  for (const raw of output.assessments) {
    if (seenSlugs.has(raw.skillSlug)) {
      rejected.push({ skillSlug: raw.skillSlug, reason: 'Duplicate assessment for this skill.' });
      continue;
    }
    seenSlugs.add(raw.skillSlug);

    const citedIds = [...new Set(raw.evidenceIds)];
    const invalid = citedIds.filter((id) => !citableEvidenceIds.has(id));

    if (invalid.length > 0) {
      rejected.push({
        skillSlug: raw.skillSlug,
        reason: `Cited ${invalid.length} evidence id(s) that were not provided: ${invalid.slice(0, 5).join(', ')}`,
      });
      continue;
    }

    if (citedIds.length === 0) {
      rejected.push({ skillSlug: raw.skillSlug, reason: 'No evidence cited.' });
      continue;
    }

    assessments.push(toPersistable(raw, citedIds));
  }

  return { assessments, rejected };
}
