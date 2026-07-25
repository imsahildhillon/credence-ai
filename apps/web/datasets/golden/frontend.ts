import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function frontendJunior01(): GoldenCase {
  const f = createEvidenceFactory('frontend-junior-01');
  const repoId = 'repo-portfolio-site';
  const repo = makeRepository(repoId, 'priya-codes/weather-dashboard', 'TypeScript');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A weather dashboard built with React and a public weather API.',
    primaryLanguage: 'TypeScript',
    daysAgo: 120,
    hasReadme: true,
    ownerLogin: 'priya-codes',
  });

  const commits = [
    f.commit({
      repositoryId: repoId,
      sha: 'c1',
      message: 'Add city search component',
      daysAgo: 110,
      files: [
        { path: 'src/components/CitySearch.tsx', additions: 60, deletions: 0, status: 'added' },
      ],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c2',
      message: 'Add unit tests for forecast formatting',
      daysAgo: 95,
      files: [{ path: 'src/utils/forecast.test.ts', additions: 40, deletions: 0, status: 'added' }],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c3',
      message: 'Fix layout overflow on mobile widths',
      daysAgo: 60,
      files: [
        { path: 'src/components/Layout.tsx', additions: 8, deletions: 3, status: 'modified' },
      ],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c4',
      message: 'Refactor forecast card into smaller components',
      daysAgo: 30,
      files: [
        {
          path: 'src/components/ForecastCard.tsx',
          additions: 30,
          deletions: 45,
          status: 'modified',
        },
      ],
    }),
  ];

  const pullRequests = [
    f.pullRequest({
      repositoryId: repoId,
      number: 1,
      title: 'Add 5-day forecast view',
      daysAgo: 100,
      merged: true,
      additions: 120,
      deletions: 10,
      changedFiles: 4,
      reviewCount: 1,
    }),
    f.pullRequest({
      repositoryId: repoId,
      number: 2,
      title: 'Improve mobile responsiveness',
      daysAgo: 55,
      merged: true,
      additions: 40,
      deletions: 12,
      changedFiles: 2,
    }),
  ];

  const issue = f.issue({
    repositoryId: repoId,
    number: 3,
    title: 'Forecast icons do not update on unit toggle',
    daysAgo: 62,
    state: 'closed',
    authorLogin: 'priya-codes',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, issue];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'frontend-junior-01',
    archetype: 'frontend',
    description:
      'Junior frontend engineer: one polished single-page React app, light testing, small merged PRs.',
    candidateLogin: 'priya-codes',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsFor([0, 1, 3, 4, 5, 6]),
      },
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([1, 4]),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([2]),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([5, 6]),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([3, 7]),
      },
    ],
    unsupportedSkills: ['backend-service-design', 'database-design', 'system-reasoning'],
  };
}

function frontendMid02(): GoldenCase {
  const f = createEvidenceFactory('frontend-mid-02');
  const repoId = 'repo-component-library';
  const repo = makeRepository(repoId, 'jordan-ui/component-library', 'TypeScript');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'An accessible React component library published to npm, with Storybook docs.',
    primaryLanguage: 'TypeScript',
    daysAgo: 300,
    hasReadme: true,
    ownerLogin: 'jordan-ui',
  });

  const commits = Array.from({ length: 8 }, (_, i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message:
        i % 3 === 0
          ? `Add unit tests for Select component (${i})`
          : i % 3 === 1
            ? `Document Button component props (${i})`
            : `Implement Tooltip component (${i})`,
      daysAgo: 280 - i * 25,
      authorLogin: 'jordan-ui',
      files: [
        {
          path:
            i % 3 === 0
              ? `src/components/Select/Select.test.tsx`
              : i % 3 === 1
                ? `docs/Button.md`
                : `src/components/Tooltip/Tooltip.tsx`,
          additions: 45,
          deletions: 5,
          status: 'modified',
        },
      ],
    }),
  );

  const pullRequests = [1, 2, 3].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: `Add ${['Select', 'Tooltip', 'Modal'][n - 1]} component with tests`,
      daysAgo: 260 - n * 40,
      merged: true,
      additions: 180,
      deletions: 15,
      changedFiles: 5,
      reviewCount: 2,
      authorLogin: 'jordan-ui',
    }),
  );

  const review = f.review({
    repositoryId: repoId,
    pullRequestNumber: 4,
    daysAgo: 100,
    state: 'CHANGES_REQUESTED',
    authorLogin: 'jordan-ui',
  });

  const issue = f.issue({
    repositoryId: repoId,
    number: 5,
    title: 'Modal traps focus incorrectly with nested dialogs',
    daysAgo: 90,
    state: 'closed',
    authorLogin: 'jordan-ui',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, review, issue];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'frontend-mid-02',
    archetype: 'frontend',
    description:
      'Mid-level frontend engineer maintaining a published component library: consistent tests, docs, reviews.',
    candidateLogin: 'jordan-ui',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
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
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.title.toLowerCase().includes('test')),
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
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'review' || e.title.includes('Document'),
        ),
      },
    ],
    unsupportedSkills: ['backend-service-design', 'database-design'],
  };
}

export const frontendCases: readonly GoldenCase[] = [frontendJunior01(), frontendMid02()];
