import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function mobileJunior01(): GoldenCase {
  const f = createEvidenceFactory('mobile-junior-01');
  const repoId = 'repo-fitness-tracker';
  const repo = makeRepository(repoId, 'ken-mobile/fitness-tracker', 'Swift');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'An iOS fitness tracker built with SwiftUI, backed by HealthKit.',
    primaryLanguage: 'Swift',
    daysAgo: 130,
    hasReadme: true,
    ownerLogin: 'ken-mobile',
  });

  const commitSpecs: readonly [string, string][] = [
    ['Sources/Views/WorkoutList.swift', 'Add workout list view'],
    ['Tests/WorkoutListTests.swift', 'Add tests for workout list sorting'],
    ['Sources/Views/WorkoutDetail.swift', 'Add workout detail view with charts'],
    ['Sources/Views/WorkoutDetail.swift', 'Fix crash when workout has no samples'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 120 - i * 20,
      files: [{ path, additions: 55, deletions: 5, status: 'modified' }],
    }),
  );

  const pullRequest = f.pullRequest({
    repositoryId: repoId,
    number: 1,
    title: 'Add workout detail screen',
    daysAgo: 90,
    merged: true,
    additions: 130,
    deletions: 10,
    changedFiles: 4,
  });

  const issue = f.issue({
    repositoryId: repoId,
    number: 2,
    title: 'App crashes opening a workout with zero samples',
    daysAgo: 62,
    state: 'closed',
    authorLogin: 'ken-mobile',
  });

  const evidence = [repoEvidence, ...commits, pullRequest, issue];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'mobile-junior-01',
    archetype: 'mobile',
    description: 'Junior mobile engineer: a small SwiftUI app with light tests and one crash fix.',
    candidateLogin: 'ken-mobile',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([0, 1, 3]),
      },
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([1, 3]),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([2]),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([4, 6]),
      },
    ],
    unsupportedSkills: ['backend-service-design', 'database-design'],
  };
}

function mobileMid02(): GoldenCase {
  const f = createEvidenceFactory('mobile-mid-02');
  const repoId = 'repo-shopping-app';
  const repo = makeRepository(repoId, 'tara-ios/shopping-app', 'Kotlin');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description:
      'A shopping app for Android, published to the Play Store, with a strong test suite.',
    primaryLanguage: 'Kotlin',
    daysAgo: 240,
    hasReadme: true,
    ownerLogin: 'tara-ios',
  });

  const commitSpecs: readonly [string, string][] = [
    ['app/src/main/CartViewModel.kt', 'Add cart view model with offline support'],
    ['app/src/test/CartViewModelTest.kt', 'Add tests for cart total calculation'],
    ['app/src/main/CheckoutScreen.kt', 'Add checkout screen with validation'],
    ['app/src/test/CheckoutScreenTest.kt', 'Add tests for checkout validation edge cases'],
    ['app/src/main/CartViewModel.kt', 'Refactor cart state into a sealed class hierarchy'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 220 - i * 25,
      authorLogin: 'tara-ios',
      files: [{ path, additions: 60, deletions: 8, status: 'modified' }],
    }),
  );

  const pullRequests = [1, 2].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: n === 1 ? 'Add offline cart support with tests' : 'Add checkout screen with tests',
      daysAgo: 200 - n * 30,
      merged: true,
      additions: 200,
      deletions: 25,
      changedFiles: 6,
      reviewCount: 1,
      authorLogin: 'tara-ios',
    }),
  );

  const review = f.review({
    repositoryId: repoId,
    pullRequestNumber: 3,
    daysAgo: 100,
    state: 'APPROVED',
    authorLogin: 'tara-ios',
  });

  const releases = ['v2.0.0', 'v2.1.0'].map((tag, i) =>
    f.release({ repositoryId: repoId, tag, daysAgo: 60 - i * 20, authorLogin: 'tara-ios' }),
  );

  const evidence = [repoEvidence, ...commits, ...pullRequests, review, ...releases];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'mobile-mid-02',
    archetype: 'mobile',
    description: 'Mid-level Android engineer: a well-tested, released shopping app.',
    candidateLogin: 'tara-ios',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'commit' || e.source_type === 'pull_request',
        ),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.title.toLowerCase().includes('test')),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'release'),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'pull_request' || e.source_type === 'commit',
        ),
      },
      {
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'review'),
      },
    ],
    unsupportedSkills: ['backend-service-design', 'database-design'],
  };
}

export const mobileCases: readonly GoldenCase[] = [mobileJunior01(), mobileMid02()];
