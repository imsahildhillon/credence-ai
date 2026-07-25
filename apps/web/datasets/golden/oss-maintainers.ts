import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function ossMaintainer01(): GoldenCase {
  const f = createEvidenceFactory('oss-maintainer-01');
  const repoId = 'repo-http-toolkit';
  const repo = makeRepository(repoId, 'chris-oss/http-toolkit', 'Go');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A widely used Go HTTP middleware toolkit, documented and semantically versioned.',
    primaryLanguage: 'Go',
    daysAgo: 800,
    hasReadme: true,
    ownerLogin: 'chris-oss',
  });

  const docCommits = ['docs/middleware.md', 'docs/getting-started.md'].map((path, i) =>
    f.commit({
      repositoryId: repoId,
      sha: `dc${i + 1}`,
      message: `Document ${path.includes('middleware') ? 'middleware composition' : 'getting-started flow'}`,
      daysAgo: 700 - i * 50,
      authorLogin: 'chris-oss',
      files: [{ path, additions: 40, deletions: 5, status: 'modified' }],
    }),
  );

  const reviews = [1, 2, 3, 4, 5].map((prNumber, i) =>
    f.review({
      repositoryId: repoId,
      pullRequestNumber: prNumber,
      daysAgo: 600 - i * 60,
      state: i % 2 === 0 ? 'APPROVED' : 'CHANGES_REQUESTED',
      authorLogin: 'chris-oss',
    }),
  );

  const contributors = ['dana-dev', 'omar-contrib', 'chris-oss'].map((login) =>
    f.contributor({
      repositoryId: repoId,
      repositoryFullName: repo.fullName,
      login,
      commits: login === 'chris-oss' ? 320 : 40,
      isOwner: login === 'chris-oss',
    }),
  );

  const issues = [1, 2, 3].map((n) =>
    f.issue({
      repositoryId: repoId,
      number: n,
      title: `Triage: ${['panic on nil handler', 'race in retry middleware', 'docs example does not compile'][n - 1]}`,
      daysAgo: 400 - n * 40,
      state: 'closed',
      authorLogin: 'chris-oss',
    }),
  );

  const releases = ['v4.0.0', 'v4.1.0', 'v4.2.0'].map((tag, i) =>
    f.release({ repositoryId: repoId, tag, daysAgo: 200 - i * 60, authorLogin: 'chris-oss' }),
  );

  const evidence = [
    repoEvidence,
    ...docCommits,
    ...reviews,
    ...contributors,
    ...issues,
    ...releases,
  ];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'oss-maintainer-01',
    archetype: 'oss_maintainer',
    description:
      'Open-source maintainer of a widely used Go library: heavy reviewing, triage, docs, and releases.',
    candidateLogin: 'chris-oss',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'review' || e.title.toLowerCase().includes('document'),
        ),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'commit' || e.source_type === 'review',
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'release'),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'issue'),
      },
      {
        skillSlug: 'api-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.title.toLowerCase().includes('document') || e.source_type === 'repository',
        ),
      },
    ],
    unsupportedSkills: ['frontend-engineering', 'database-design'],
  };
}

function ossMaintainer02(): GoldenCase {
  const f = createEvidenceFactory('oss-maintainer-02');
  const repoId = 'repo-config-parser';
  const repo = makeRepository(repoId, 'wei-maintainer/config-parser', 'Rust');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A small, focused Rust crate for parsing layered configuration files.',
    primaryLanguage: 'Rust',
    daysAgo: 300,
    hasReadme: true,
    ownerLogin: 'wei-maintainer',
  });

  const commits = [1, 2].map((i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i}`,
      message:
        i === 1 ? 'Add support for layered overrides' : 'Fix precedence bug in env-var overrides',
      daysAgo: 260 - i * 40,
      authorLogin: 'wei-maintainer',
      files: [{ path: 'src/lib.rs', additions: 35, deletions: 6, status: 'modified' }],
    }),
  );

  const reviews = [1, 2].map((prNumber) =>
    f.review({
      repositoryId: repoId,
      pullRequestNumber: prNumber,
      daysAgo: 150 - prNumber * 30,
      state: 'APPROVED',
      authorLogin: 'wei-maintainer',
    }),
  );

  const pullRequest = f.pullRequest({
    repositoryId: repoId,
    number: 3,
    title: 'Accept contributed TOML backend',
    daysAgo: 100,
    merged: true,
    additions: 90,
    deletions: 5,
    changedFiles: 3,
    authorLogin: 'wei-maintainer',
  });

  const release = f.release({
    repositoryId: repoId,
    tag: 'v0.3.0',
    daysAgo: 50,
    authorLogin: 'wei-maintainer',
  });

  const evidence = [repoEvidence, ...commits, ...reviews, pullRequest, release];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'oss-maintainer-02',
    archetype: 'oss_maintainer',
    description: 'Maintainer of a small, focused Rust crate: modest but steady activity.',
    candidateLogin: 'wei-maintainer',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'review'),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'commit' || e.source_type === 'pull_request',
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'release'),
      },
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'commit'),
      },
    ],
    // A handful of commits on one small crate should not read as broad
    // system reasoning — this is the deliberately-thin "extra skill" trap.
    unsupportedSkills: [
      'frontend-engineering',
      'backend-service-design',
      'database-design',
      'system-reasoning',
    ],
  };
}

export const ossMaintainerCases: readonly GoldenCase[] = [ossMaintainer01(), ossMaintainer02()];
