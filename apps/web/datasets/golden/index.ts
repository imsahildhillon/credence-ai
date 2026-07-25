import type { GoldenCase, GoldenDataset } from '@/features/evaluation/types';

import { backendCases } from './backend';
import { beginnerCases } from './beginners';
import { frontendCases } from './frontend';
import { fullstackCases } from './fullstack';
import { mlCases } from './ml';
import { mobileCases } from './mobile';
import { ossMaintainerCases } from './oss-maintainers';
import { seniorCases } from './seniors';
import { GOLDEN_TAXONOMY } from './taxonomy';

const ALL_CASES: readonly GoldenCase[] = [
  ...frontendCases,
  ...backendCases,
  ...fullstackCases,
  ...mlCases,
  ...mobileCases,
  ...ossMaintainerCases,
  ...beginnerCases,
  ...seniorCases,
];

/**
 * Fails loudly rather than silently at import time (CLAUDE.md §2.7) — a
 * duplicated case id or a case with fewer than 20 total would otherwise
 * surface only as a confusing metrics discrepancy much later.
 */
function assertDatasetIntegrity(cases: readonly GoldenCase[]): void {
  const MINIMUM_CASE_COUNT = 20;
  if (cases.length < MINIMUM_CASE_COUNT) {
    throw new Error(
      `Golden dataset has ${cases.length} case(s); at least ${MINIMUM_CASE_COUNT} are required.`,
    );
  }

  const seenIds = new Set<string>();
  for (const goldenCase of cases) {
    if (seenIds.has(goldenCase.id)) {
      throw new Error(`Duplicate golden case id: "${goldenCase.id}"`);
    }
    seenIds.add(goldenCase.id);

    const seenEvidenceIds = new Set<string>();
    for (const evidence of goldenCase.evidence) {
      if (seenEvidenceIds.has(evidence.id)) {
        throw new Error(`Case "${goldenCase.id}" has a duplicate evidence id: "${evidence.id}"`);
      }
      seenEvidenceIds.add(evidence.id);
    }

    for (const expected of goldenCase.expectedSkills) {
      for (const evidenceId of expected.expectedEvidenceIds) {
        if (!seenEvidenceIds.has(evidenceId)) {
          throw new Error(
            `Case "${goldenCase.id}" expects evidence id "${evidenceId}" for skill "${expected.skillSlug}", but no such evidence exists in the case.`,
          );
        }
      }
    }
  }
}

assertDatasetIntegrity(ALL_CASES);

export const GOLDEN_DATASET: GoldenDataset = {
  cases: ALL_CASES,
  skills: GOLDEN_TAXONOMY,
};
