import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function backendJunior01(): GoldenCase {
  const f = createEvidenceFactory('backend-junior-01');
  const repoId = 'repo-todo-api';
  const repo = makeRepository(repoId, 'sam-backend/todo-api', 'Python');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A small REST API for managing todos, backed by Postgres.',
    primaryLanguage: 'Python',
    daysAgo: 150,
    hasReadme: true,
    ownerLogin: 'sam-backend',
  });

  const commits = [
    f.commit({
      repositoryId: repoId,
      sha: 'c1',
      message: 'Add initial todos table migration',
      daysAgo: 145,
      files: [
        { path: 'migrations/0001_create_todos.sql', additions: 20, deletions: 0, status: 'added' },
      ],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c2',
      message: 'Add tests for todo creation endpoint',
      daysAgo: 130,
      files: [{ path: 'tests/test_todos.py', additions: 35, deletions: 0, status: 'added' }],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c3',
      message: 'Fix crash when due_date is missing',
      daysAgo: 90,
      files: [{ path: 'app/routes/todos.py', additions: 6, deletions: 2, status: 'modified' }],
    }),
    f.commit({
      repositoryId: repoId,
      sha: 'c4',
      message: 'Add pagination to list endpoint',
      daysAgo: 60,
      files: [{ path: 'app/routes/todos.py', additions: 25, deletions: 5, status: 'modified' }],
    }),
  ];

  const pullRequests = [1, 2].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: n === 1 ? 'Add todo creation endpoint' : 'Add pagination and filtering',
      daysAgo: 140 - n * 40,
      merged: true,
      additions: 90,
      deletions: 10,
      changedFiles: 3,
    }),
  );

  const issue = f.issue({
    repositoryId: repoId,
    number: 3,
    title: 'API returns 500 when due_date is omitted',
    daysAgo: 92,
    state: 'closed',
    authorLogin: 'sam-backend',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, issue];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'backend-junior-01',
    archetype: 'backend',
    description:
      'Junior backend engineer: a small CRUD API with a migration, light tests, one bug fix.',
    candidateLogin: 'sam-backend',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([0, 3, 5, 6]),
      },
      {
        skillSlug: 'database-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([1]),
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
        expectedEvidenceIds: idsFor([3, 7]),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([5, 6]),
      },
    ],
    unsupportedSkills: ['frontend-engineering', 'system-reasoning'],
  };
}

function backendMid02(): GoldenCase {
  const f = createEvidenceFactory('backend-mid-02');
  const repoId = 'repo-orders-service';
  const repo = makeRepository(repoId, 'nina-api/orders-service', 'Go');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'Orders microservice with a documented HTTP API and Postgres persistence.',
    primaryLanguage: 'Go',
    daysAgo: 260,
    hasReadme: true,
    ownerLogin: 'nina-api',
  });

  const commitSpecs: readonly [string, string][] = [
    ['migrations/0007_add_order_status_index.sql', 'Add index on order status for faster queries'],
    ['migrations/0008_add_refunds_table.sql', 'Add refunds table and foreign key to orders'],
    ['internal/orders/orders_test.go', 'Add table-driven tests for order state transitions'],
    ['internal/orders/orders_test.go', 'Add tests for refund edge cases'],
    ['.github/workflows/deploy.yml', 'Add CI workflow to deploy on tag push'],
    ['Dockerfile', 'Add multi-stage Dockerfile for smaller images'],
    ['docs/api.md', 'Document orders API endpoints and error codes'],
    ['internal/orders/handler.go', 'Add input validation for create-order endpoint'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 240 - i * 20,
      authorLogin: 'nina-api',
      files: [{ path, additions: 40, deletions: 6, status: 'modified' }],
    }),
  );

  const pullRequests = ['Add refunds support', 'Add deploy workflow', 'Add API documentation'].map(
    (title, i) => {
      const n = i + 1;
      return f.pullRequest({
        repositoryId: repoId,
        number: n,
        title,
        daysAgo: 220 - n * 30,
        merged: true,
        additions: 150,
        deletions: 20,
        changedFiles: 6,
        reviewCount: 1,
        authorLogin: 'nina-api',
      });
    },
  );

  const release = f.release({
    repositoryId: repoId,
    tag: 'v1.2.0',
    daysAgo: 60,
    authorLogin: 'nina-api',
  });

  const issue = f.issue({
    repositoryId: repoId,
    number: 4,
    title: 'Duplicate refunds possible under concurrent requests',
    daysAgo: 70,
    state: 'closed',
    authorLogin: 'nina-api',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, release, issue];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'backend-mid-02',
    archetype: 'backend',
    description:
      'Mid-level backend engineer running a Go microservice with migrations, CI, and docs.',
    candidateLogin: 'nina-api',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
      {
        skillSlug: 'database-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('migration') ||
            e.title.toLowerCase().includes('index') ||
            e.title.toLowerCase().includes('table'),
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('deploy') ||
            e.title.toLowerCase().includes('docker') ||
            e.source_type === 'release',
        ),
      },
      {
        skillSlug: 'api-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('api') || e.title.toLowerCase().includes('validation'),
        ),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.title.toLowerCase().includes('test')),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'issue' || e.title.toLowerCase().includes('refund'),
        ),
      },
    ],
    unsupportedSkills: ['frontend-engineering'],
  };
}

function backendSenior03(): GoldenCase {
  const f = createEvidenceFactory('backend-senior-03');
  const paymentsId = 'repo-payments-core';
  const infraId = 'repo-infra-tools';
  const payments = makeRepository(paymentsId, 'victor-systems/payments-core', 'Go');
  const infra = makeRepository(infraId, 'victor-systems/infra-tools', 'Go');

  const paymentsRepoEvidence = f.repository({
    repositoryId: paymentsId,
    fullName: payments.fullName,
    description:
      'Payments processing core: idempotent transaction handling and ledger reconciliation.',
    primaryLanguage: 'Go',
    daysAgo: 500,
    hasReadme: true,
    ownerLogin: 'victor-systems',
  });
  const infraRepoEvidence = f.repository({
    repositoryId: infraId,
    fullName: infra.fullName,
    description: 'Internal deployment and observability tooling used across services.',
    primaryLanguage: 'Go',
    daysAgo: 480,
    hasReadme: true,
    ownerLogin: 'victor-systems',
  });

  const paymentsCommitSpecs: readonly [string, string][] = [
    ['internal/ledger/schema.sql', 'Design ledger schema with append-only entries'],
    ['internal/ledger/reconcile.go', 'Optimize reconciliation query with covering index'],
    ['internal/auth/middleware.go', 'Add request signing middleware for internal auth'],
    ['internal/auth/middleware.go', 'Fix auth bypass when signature header is empty'],
    ['internal/ledger/reconcile_test.go', 'Add property-based tests for reconciliation'],
    ['internal/cache/lru.go', 'Add LRU cache to reduce latency on hot account lookups'],
    ['docs/architecture.md', 'Document ledger consistency model and failure modes'],
  ];
  const paymentsCommits = paymentsCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: paymentsId,
      sha: `pc${i + 1}`,
      message,
      daysAgo: 470 - i * 30,
      authorLogin: 'victor-systems',
      files: [{ path, additions: 60, deletions: 10, status: 'modified' }],
    }),
  );

  const infraCommitSpecs: readonly [string, string][] = [
    ['.github/workflows/deploy.yml', 'Add blue-green deployment workflow'],
    ['Dockerfile', 'Slim runtime image and add healthcheck'],
    ['cmd/rollout/main.go', 'Add automated rollback on failed health checks'],
  ];
  const infraCommits = infraCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: infraId,
      sha: `ic${i + 1}`,
      message,
      daysAgo: 300 - i * 25,
      authorLogin: 'victor-systems',
      files: [{ path, additions: 45, deletions: 8, status: 'modified' }],
    }),
  );

  const pullRequests = [
    'Add ledger reconciliation',
    'Harden auth middleware',
    'Add reconciliation tests',
  ].map((title, i) => {
    const n = i + 1;
    return f.pullRequest({
      repositoryId: paymentsId,
      number: n,
      title,
      daysAgo: 460 - n * 40,
      merged: true,
      additions: 200,
      deletions: 30,
      changedFiles: 8,
      reviewCount: 2,
      authorLogin: 'victor-systems',
    });
  });

  const reviews = [10, 11, 12].map((prNumber, i) =>
    f.review({
      repositoryId: paymentsId,
      pullRequestNumber: prNumber,
      daysAgo: 200 - i * 20,
      state: 'CHANGES_REQUESTED',
      authorLogin: 'victor-systems',
    }),
  );

  const releases = ['v3.0.0', 'v3.1.0'].map((tag, i) =>
    f.release({ repositoryId: infraId, tag, daysAgo: 100 - i * 30, authorLogin: 'victor-systems' }),
  );

  const issue = f.issue({
    repositoryId: paymentsId,
    number: 20,
    title: 'Duplicate ledger entries under retried webhook delivery',
    daysAgo: 250,
    state: 'closed',
    authorLogin: 'victor-systems',
  });

  const contributor = f.contributor({
    repositoryId: paymentsId,
    repositoryFullName: payments.fullName,
    login: 'victor-systems',
    commits: 210,
    isOwner: true,
  });

  const evidence = [
    paymentsRepoEvidence,
    infraRepoEvidence,
    ...paymentsCommits,
    ...infraCommits,
    ...pullRequests,
    ...reviews,
    ...releases,
    issue,
    contributor,
  ];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'backend-senior-03',
    archetype: 'backend',
    description:
      'Senior backend/systems engineer: payments core with reconciliation, auth hardening, and deploy tooling.',
    candidateLogin: 'victor-systems',
    repositories: [payments, infra],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'system-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('optimize') ||
            e.title.toLowerCase().includes('auth') ||
            e.title.toLowerCase().includes('cache') ||
            e.title.toLowerCase().includes('architecture') ||
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
            e.title.toLowerCase().includes('ledger') || e.title.toLowerCase().includes('schema'),
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('deploy') ||
            e.title.toLowerCase().includes('rollback') ||
            e.source_type === 'release',
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
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.source_type === 'review' || e.title.toLowerCase().includes('document'),
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

export const backendCases: readonly GoldenCase[] = [
  backendJunior01(),
  backendMid02(),
  backendSenior03(),
];
