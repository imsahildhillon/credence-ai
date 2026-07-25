import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

/**
 * The 'senior' archetype has three cases across the dataset: the two here
 * plus `fullstack-senior-03` in `fullstack.ts` (a senior generalist fit
 * naturally alongside its fullstack peers file-wise, but tagged 'senior'
 * for coverage reporting since that is what it evaluates).
 */

function seniorStaff01(): GoldenCase {
  const f = createEvidenceFactory('senior-staff-01');
  const coreId = 'repo-search-core';
  const gatewayId = 'repo-api-gateway';
  const core = makeRepository(coreId, 'marcus-staff/search-core', 'Java');
  const gateway = makeRepository(gatewayId, 'marcus-staff/api-gateway', 'Java');

  const repoEvidences = [
    f.repository({
      repositoryId: coreId,
      fullName: core.fullName,
      description: 'Search indexing and ranking core, documented and load-tested.',
      primaryLanguage: 'Java',
      daysAgo: 600,
      hasReadme: true,
      ownerLogin: 'marcus-staff',
    }),
    f.repository({
      repositoryId: gatewayId,
      fullName: gateway.fullName,
      description: 'API gateway fronting internal services with a documented public contract.',
      primaryLanguage: 'Java',
      daysAgo: 600,
      hasReadme: true,
      ownerLogin: 'marcus-staff',
    }),
  ];

  const coreCommitSpecs: readonly [string, string][] = [
    [
      'src/main/java/ranking/ScoreOptimizer.java',
      'Optimize ranking score computation to cut p99 latency in half',
    ],
    ['schema/index-schema.json', 'Design new index schema for faceted search'],
    ['src/main/java/ranking/ScoreOptimizerTest.java', 'Add benchmark tests for score optimizer'],
    ['docs/architecture.md', 'Document sharding and replication strategy'],
  ];
  const gatewayCommitSpecs: readonly [string, string][] = [
    ['src/main/java/auth/TokenValidator.java', 'Add token validation with clock-skew tolerance'],
    ['src/main/java/auth/TokenValidator.java', 'Fix token replay vulnerability in validator'],
    ['docs/api-contract.md', 'Document public API versioning and deprecation policy'],
    ['.github/workflows/deploy.yml', 'Add staged rollout with automatic rollback'],
  ];

  const coreCommits = coreCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: coreId,
      sha: `cc${i + 1}`,
      message,
      daysAgo: 580 - i * 40,
      authorLogin: 'marcus-staff',
      files: [{ path, additions: 70, deletions: 15, status: 'modified' }],
    }),
  );
  const gatewayCommits = gatewayCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: gatewayId,
      sha: `gc${i + 1}`,
      message,
      daysAgo: 500 - i * 40,
      authorLogin: 'marcus-staff',
      files: [{ path, additions: 65, deletions: 12, status: 'modified' }],
    }),
  );

  const pullRequests = [
    f.pullRequest({
      repositoryId: coreId,
      number: 10,
      title: 'Add faceted search index schema',
      daysAgo: 450,
      merged: true,
      additions: 300,
      deletions: 40,
      changedFiles: 9,
      reviewCount: 2,
      authorLogin: 'marcus-staff',
    }),
    f.pullRequest({
      repositoryId: gatewayId,
      number: 12,
      title: 'Patch token replay vulnerability',
      daysAgo: 380,
      merged: true,
      additions: 90,
      deletions: 10,
      changedFiles: 3,
      reviewCount: 2,
      authorLogin: 'marcus-staff',
    }),
  ];

  const reviews = [30, 31, 32, 33].map((prNumber, i) =>
    f.review({
      repositoryId: gatewayId,
      pullRequestNumber: prNumber,
      daysAgo: 300 - i * 30,
      state: i % 2 === 0 ? 'APPROVED' : 'CHANGES_REQUESTED',
      authorLogin: 'marcus-staff',
    }),
  );

  const issue = f.issue({
    repositoryId: coreId,
    number: 40,
    title: 'Ranking query times out on cold cache',
    daysAgo: 550,
    state: 'closed',
    authorLogin: 'marcus-staff',
  });

  const evidence = [
    ...repoEvidences,
    ...coreCommits,
    ...gatewayCommits,
    ...pullRequests,
    ...reviews,
    issue,
  ];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'senior-staff-01',
    archetype: 'senior',
    description:
      'Staff-level backend engineer: search ranking core and a hardened API gateway, documented and reviewed.',
    candidateLogin: 'marcus-staff',
    repositories: [core, gateway],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'system-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('optimize') ||
            e.title.toLowerCase().includes('vulnerab') ||
            e.title.toLowerCase().includes('sharding') ||
            e.source_type === 'repository',
        ),
      },
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
      {
        skillSlug: 'database-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('schema') || e.title.toLowerCase().includes('index'),
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('rollout') || e.title.toLowerCase().includes('rollback'),
        ),
      },
      {
        skillSlug: 'api-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('api') || e.title.toLowerCase().includes('contract'),
        ),
      },
      {
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'review' || e.title.toLowerCase().includes('document'),
        ),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'issue' || e.title.toLowerCase().includes('fix'),
        ),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'pull_request' || e.source_type === 'commit',
        ),
      },
    ],
    unsupportedSkills: ['frontend-engineering'],
  };
}

function seniorPlatform02(): GoldenCase {
  const f = createEvidenceFactory('senior-platform-02');
  const repoId = 'repo-deploy-platform';
  const repo = makeRepository(repoId, 'ravi-platform/deploy-platform', 'Go');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description:
      'Internal deployment platform: rollout orchestration, health checks, and test harness.',
    primaryLanguage: 'Go',
    daysAgo: 450,
    hasReadme: true,
    ownerLogin: 'ravi-platform',
  });

  const commitSpecs: readonly [string, string][] = [
    ['internal/rollout/canary.go', 'Design canary rollout strategy with automatic rollback'],
    ['internal/rollout/canary_test.go', 'Add tests for canary rollback decision logic'],
    ['internal/health/checker.go', 'Add configurable health check with backoff'],
    ['internal/health/checker_test.go', 'Add tests for health checker edge cases'],
    ['.github/workflows/release.yml', 'Add release workflow with staged environments'],
    ['Dockerfile', 'Reduce image size and add non-root user'],
    ['internal/rollout/canary.go', 'Fix race condition when two rollouts overlap'],
    ['internal/metrics/exporter.go', 'Optimize metrics exporter to reduce scrape latency'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 420 - i * 35,
      authorLogin: 'ravi-platform',
      files: [{ path, additions: 60, deletions: 10, status: 'modified' }],
    }),
  );

  const pullRequests = [1, 2].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: n === 1 ? 'Add canary rollout with rollback' : 'Add health checker with tests',
      daysAgo: 380 - n * 60,
      merged: true,
      additions: 220,
      deletions: 20,
      changedFiles: 6,
      reviewCount: 1,
      authorLogin: 'ravi-platform',
    }),
  );

  const issue = f.issue({
    repositoryId: repoId,
    number: 5,
    title: 'Overlapping rollouts corrupt deployment state',
    daysAgo: 300,
    state: 'closed',
    authorLogin: 'ravi-platform',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, issue];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'senior-platform-02',
    archetype: 'senior',
    description:
      'Senior platform engineer: deployment orchestration with strong tests and rollback safety.',
    candidateLogin: 'ravi-platform',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
      {
        skillSlug: 'system-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('design') ||
            e.title.toLowerCase().includes('optimize') ||
            e.source_type === 'repository',
        ),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.title.toLowerCase().includes('test')),
      },
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'commit' || e.source_type === 'pull_request',
        ),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.source_type === 'issue' ||
            e.title.toLowerCase().includes('fix') ||
            e.title.toLowerCase().includes('race'),
        ),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'pull_request' || e.source_type === 'commit',
        ),
      },
    ],
    unsupportedSkills: ['frontend-engineering'],
  };
}

export const seniorCases: readonly GoldenCase[] = [seniorStaff01(), seniorPlatform02()];
