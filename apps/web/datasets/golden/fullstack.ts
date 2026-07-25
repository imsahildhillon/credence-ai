import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function fullstackJunior01(): GoldenCase {
  const f = createEvidenceFactory('fullstack-junior-01');
  const repoId = 'repo-recipe-app';
  const repo = makeRepository(repoId, 'maria-full/recipe-app', 'TypeScript');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'Full-stack recipe app: Next.js frontend with a Postgres-backed API.',
    primaryLanguage: 'TypeScript',
    daysAgo: 150,
    hasReadme: true,
    ownerLogin: 'maria-full',
  });

  const commitSpecs: readonly [string, string][] = [
    ['migrations/0001_create_recipes.sql', 'Add recipes and ingredients tables'],
    ['app/components/RecipeCard.tsx', 'Add recipe card component'],
    ['app/api/recipes/route.ts', 'Add recipes list API route'],
    ['app/components/RecipeCard.test.tsx', 'Add tests for recipe card rendering'],
    ['app/api/recipes/route.ts', 'Add pagination to recipes API'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 140 - i * 20,
      files: [{ path, additions: 40, deletions: 5, status: 'modified' }],
    }),
  );

  const pullRequests = [1, 2].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: n === 1 ? 'Add recipe list page and API' : 'Add search and pagination',
      daysAgo: 130 - n * 30,
      merged: true,
      additions: 150,
      deletions: 15,
      changedFiles: 5,
    }),
  );

  const evidence = [repoEvidence, ...commits, ...pullRequests];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'fullstack-junior-01',
    archetype: 'fullstack',
    description: 'Junior full-stack engineer: a Next.js app with a small API and one migration.',
    candidateLogin: 'maria-full',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([0, 2, 4]),
      },
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([0, 3, 5]),
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
        expectedEvidenceIds: idsFor([4]),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([6, 7]),
      },
    ],
    unsupportedSkills: ['system-reasoning', 'deployment-operability'],
  };
}

function fullstackMid02(): GoldenCase {
  const f = createEvidenceFactory('fullstack-mid-02');
  const webId = 'repo-marketplace-web';
  const apiId = 'repo-marketplace-api';
  const web = makeRepository(webId, 'leo-stack/marketplace-web', 'TypeScript');
  const api = makeRepository(apiId, 'leo-stack/marketplace-api', 'TypeScript');

  const webRepoEvidence = f.repository({
    repositoryId: webId,
    fullName: web.fullName,
    description: 'Marketplace storefront built with React and tested with Testing Library.',
    primaryLanguage: 'TypeScript',
    daysAgo: 260,
    hasReadme: true,
    ownerLogin: 'leo-stack',
  });
  const apiRepoEvidence = f.repository({
    repositoryId: apiId,
    fullName: api.fullName,
    description: 'Marketplace API: listings, orders, and search, documented and containerized.',
    primaryLanguage: 'TypeScript',
    daysAgo: 260,
    hasReadme: true,
    ownerLogin: 'leo-stack',
  });

  const webCommitSpecs: readonly [string, string][] = [
    ['src/components/ListingCard.tsx', 'Add listing card component'],
    ['src/components/ListingCard.test.tsx', 'Add tests for listing card'],
    ['src/pages/checkout.tsx', 'Add checkout flow'],
    ['src/pages/checkout.test.tsx', 'Add tests for checkout flow edge cases'],
  ];
  const webCommits = webCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: webId,
      sha: `wc${i + 1}`,
      message,
      daysAgo: 240 - i * 25,
      authorLogin: 'leo-stack',
      files: [{ path, additions: 50, deletions: 6, status: 'modified' }],
    }),
  );

  const apiCommitSpecs: readonly [string, string][] = [
    ['migrations/0004_add_listings_index.sql', 'Add index on listings by category'],
    ['migrations/0005_add_orders_table.sql', 'Add orders table with foreign keys'],
    ['src/routes/orders.ts', 'Add order creation endpoint with validation'],
    ['docs/api.md', 'Document listings and orders endpoints'],
    ['.github/workflows/ci.yml', 'Add CI workflow with test and deploy stages'],
    ['Dockerfile', 'Add production Dockerfile'],
  ];
  const apiCommits = apiCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: apiId,
      sha: `ac${i + 1}`,
      message,
      daysAgo: 230 - i * 20,
      authorLogin: 'leo-stack',
      files: [{ path, additions: 55, deletions: 8, status: 'modified' }],
    }),
  );

  const pullRequests = [
    f.pullRequest({
      repositoryId: webId,
      number: 1,
      title: 'Add checkout flow with tests',
      daysAgo: 200,
      merged: true,
      additions: 220,
      deletions: 20,
      changedFiles: 6,
      reviewCount: 1,
      authorLogin: 'leo-stack',
    }),
    f.pullRequest({
      repositoryId: apiId,
      number: 1,
      title: 'Add orders API with migrations and docs',
      daysAgo: 190,
      merged: true,
      additions: 260,
      deletions: 25,
      changedFiles: 7,
      reviewCount: 2,
      authorLogin: 'leo-stack',
    }),
  ];

  const review = f.review({
    repositoryId: apiId,
    pullRequestNumber: 2,
    daysAgo: 120,
    state: 'APPROVED',
    authorLogin: 'leo-stack',
  });

  const evidence = [
    webRepoEvidence,
    apiRepoEvidence,
    ...webCommits,
    ...apiCommits,
    ...pullRequests,
    review,
  ];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'fullstack-mid-02',
    archetype: 'fullstack',
    description:
      'Mid-level full-stack engineer across a tested storefront and a documented, deployed API.',
    candidateLogin: 'leo-stack',
    repositories: [web, api],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.repository_id === webId),
      },
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.repository_id === apiId),
      },
      {
        skillSlug: 'database-design',
        expectedLevel: 'developing',
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
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.title.toLowerCase().includes('ci') || e.title.toLowerCase().includes('docker'),
        ),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'strong',
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
          (e) => e.source_type === 'review' || e.title.toLowerCase().includes('document'),
        ),
      },
    ],
  };
}

function fullstackSenior03(): GoldenCase {
  const f = createEvidenceFactory('fullstack-senior-03');
  const webId = 'repo-platform-web';
  const apiId = 'repo-platform-api';
  const infraId = 'repo-platform-infra';
  const web = makeRepository(webId, 'aisha-lead/platform-web', 'TypeScript');
  const api = makeRepository(apiId, 'aisha-lead/platform-api', 'TypeScript');
  const infra = makeRepository(infraId, 'aisha-lead/platform-infra', 'HCL');

  const repoEvidences = [
    f.repository({
      repositoryId: webId,
      fullName: web.fullName,
      description: 'Customer-facing platform dashboard, accessible and thoroughly tested.',
      primaryLanguage: 'TypeScript',
      daysAgo: 500,
      hasReadme: true,
      ownerLogin: 'aisha-lead',
    }),
    f.repository({
      repositoryId: apiId,
      fullName: api.fullName,
      description: 'Platform API with documented endpoints, auth, and query-optimized data access.',
      primaryLanguage: 'TypeScript',
      daysAgo: 500,
      hasReadme: true,
      ownerLogin: 'aisha-lead',
    }),
    f.repository({
      repositoryId: infraId,
      fullName: infra.fullName,
      description: 'Infrastructure-as-code for the platform: deploy pipelines and environments.',
      primaryLanguage: 'HCL',
      daysAgo: 500,
      hasReadme: true,
      ownerLogin: 'aisha-lead',
    }),
  ];

  const webCommitSpecs: readonly [string, string][] = [
    ['src/components/Dashboard.tsx', 'Add dashboard overview page'],
    ['src/components/Dashboard.test.tsx', 'Add tests for dashboard data states'],
    [
      'src/components/Dashboard.tsx',
      'Refactor dashboard into presentational and container components',
    ],
  ];
  const apiCommitSpecs: readonly [string, string][] = [
    ['migrations/0012_add_query_covering_index.sql', 'Add covering index for hot dashboard query'],
    ['src/auth/middleware.ts', 'Add rate limiting middleware to protect auth endpoints'],
    ['src/auth/middleware.ts', 'Fix privilege escalation in role-check middleware'],
    ['docs/api.md', 'Document authentication and rate-limit behavior'],
    ['src/routes/reports.ts', 'Optimize reports endpoint to avoid N+1 queries'],
  ];
  const infraCommitSpecs: readonly [string, string][] = [
    ['.github/workflows/deploy.yml', 'Add canary deployment workflow'],
    ['modules/network/main.tf', 'Design network module with least-privilege security groups'],
    ['modules/network/main.tf', 'Add automated rollback on canary failure'],
  ];

  const webCommits = webCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: webId,
      sha: `wc${i + 1}`,
      message,
      daysAgo: 480 - i * 30,
      authorLogin: 'aisha-lead',
      files: [{ path, additions: 60, deletions: 10, status: 'modified' }],
    }),
  );
  const apiCommits = apiCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: apiId,
      sha: `ac${i + 1}`,
      message,
      daysAgo: 460 - i * 30,
      authorLogin: 'aisha-lead',
      files: [{ path, additions: 55, deletions: 12, status: 'modified' }],
    }),
  );
  const infraCommits = infraCommitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: infraId,
      sha: `ic${i + 1}`,
      message,
      daysAgo: 440 - i * 30,
      authorLogin: 'aisha-lead',
      files: [{ path, additions: 50, deletions: 9, status: 'modified' }],
    }),
  );

  const pullRequests = [
    f.pullRequest({
      repositoryId: apiId,
      number: 5,
      title: 'Harden auth middleware and add rate limiting',
      daysAgo: 300,
      merged: true,
      additions: 180,
      deletions: 20,
      changedFiles: 5,
      reviewCount: 2,
      authorLogin: 'aisha-lead',
    }),
    f.pullRequest({
      repositoryId: infraId,
      number: 3,
      title: 'Add canary deploys with automatic rollback',
      daysAgo: 250,
      merged: true,
      additions: 140,
      deletions: 15,
      changedFiles: 4,
      reviewCount: 1,
      authorLogin: 'aisha-lead',
    }),
  ];

  const reviews = [20, 21, 22].map((prNumber, i) =>
    f.review({
      repositoryId: apiId,
      pullRequestNumber: prNumber,
      daysAgo: 200 - i * 20,
      state: 'APPROVED',
      authorLogin: 'aisha-lead',
    }),
  );

  const issue = f.issue({
    repositoryId: apiId,
    number: 30,
    title: 'Dashboard query times out under load',
    daysAgo: 320,
    state: 'closed',
    authorLogin: 'aisha-lead',
  });

  const evidence = [
    ...repoEvidences,
    ...webCommits,
    ...apiCommits,
    ...infraCommits,
    ...pullRequests,
    ...reviews,
    issue,
  ];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'fullstack-senior-03',
    archetype: 'senior',
    description:
      'Senior full-stack/platform engineer spanning a tested dashboard, a hardened API, and deployment infra.',
    candidateLogin: 'aisha-lead',
    repositories: [web, api, infra],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate((e) => e.repository_id === webId),
      },
      {
        skillSlug: 'backend-service-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate((e) => e.repository_id === apiId),
      },
      {
        skillSlug: 'database-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.title.toLowerCase().includes('index') || e.title.toLowerCase().includes('n+1'),
        ),
      },
      {
        skillSlug: 'system-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('optimize') ||
            e.title.toLowerCase().includes('privilege') ||
            e.title.toLowerCase().includes('network') ||
            e.title.toLowerCase().includes('security groups'),
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.repository_id === infraId || e.title.toLowerCase().includes('deploy'),
        ),
      },
      {
        skillSlug: 'api-design',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('document') || e.title.toLowerCase().includes('api'),
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
        expectedLevel: 'strong',
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
  };
}

export const fullstackCases: readonly GoldenCase[] = [
  fullstackJunior01(),
  fullstackMid02(),
  fullstackSenior03(),
];
