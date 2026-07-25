import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function mlJunior01(): GoldenCase {
  const f = createEvidenceFactory('ml-junior-01');
  const repoId = 'repo-image-classifier';
  const repo = makeRepository(repoId, 'devon-ml/image-classifier', 'Python');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description:
      'A CNN image classifier trained on a public dataset, with a small evaluation script.',
    primaryLanguage: 'Python',
    daysAgo: 100,
    hasReadme: true,
    ownerLogin: 'devon-ml',
  });

  const commitSpecs: readonly [string, string][] = [
    ['data/preprocess.py', 'Add data preprocessing and augmentation pipeline'],
    ['models/train.py', 'Add training loop with checkpointing'],
    ['tests/test_preprocess.py', 'Add tests for preprocessing edge cases'],
    ['models/train.py', 'Fix loss spike caused by unnormalized inputs'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 90 - i * 15,
      files: [{ path, additions: 45, deletions: 4, status: 'modified' }],
    }),
  );

  const issue = f.issue({
    repositoryId: repoId,
    number: 1,
    title: 'Training loss spikes after epoch 3',
    daysAgo: 65,
    state: 'closed',
    authorLogin: 'devon-ml',
  });

  const evidence = [repoEvidence, ...commits, issue];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'ml-junior-01',
    archetype: 'ml',
    description: 'Junior ML engineer: a single training pipeline with light tests and one bug fix.',
    candidateLogin: 'devon-ml',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([1, 2, 4]),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([3]),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([4, 5]),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([1, 2, 3, 4]),
      },
    ],
    unsupportedSkills: ['frontend-engineering', 'backend-service-design', 'deployment-operability'],
  };
}

function mlMid02(): GoldenCase {
  const f = createEvidenceFactory('ml-mid-02');
  const repoId = 'repo-nlp-pipeline';
  const repo = makeRepository(repoId, 'sofia-ml/nlp-pipeline', 'Python');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description:
      'A packaged NLP pipeline for text classification, containerized and released to a registry.',
    primaryLanguage: 'Python',
    daysAgo: 220,
    hasReadme: true,
    ownerLogin: 'sofia-ml',
  });

  const commitSpecs: readonly [string, string][] = [
    ['pipeline/tokenizer.py', 'Add configurable tokenizer with caching'],
    ['tests/test_tokenizer.py', 'Add unit tests for tokenizer edge cases'],
    ['pipeline/classifier.py', 'Refactor classifier into reusable components'],
    ['tests/test_classifier.py', 'Add regression tests for classifier accuracy'],
    ['Dockerfile', 'Add Dockerfile for reproducible training environment'],
    ['pipeline/classifier.py', 'Fix off-by-one error in label indexing'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 200 - i * 20,
      authorLogin: 'sofia-ml',
      files: [{ path, additions: 50, deletions: 6, status: 'modified' }],
    }),
  );

  const pullRequests = [1, 2].map((n) =>
    f.pullRequest({
      repositoryId: repoId,
      number: n,
      title: n === 1 ? 'Add tokenizer with tests' : 'Refactor classifier and add regression tests',
      daysAgo: 190 - n * 30,
      merged: true,
      additions: 160,
      deletions: 20,
      changedFiles: 5,
      reviewCount: 1,
      authorLogin: 'sofia-ml',
    }),
  );

  const review = f.review({
    repositoryId: repoId,
    pullRequestNumber: 3,
    daysAgo: 80,
    state: 'APPROVED',
    authorLogin: 'sofia-ml',
  });

  const release = f.release({
    repositoryId: repoId,
    tag: 'v0.4.0',
    daysAgo: 40,
    authorLogin: 'sofia-ml',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, review, release];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'ml-mid-02',
    archetype: 'ml',
    description:
      'Mid-level ML engineer: a tested, containerized NLP pipeline with a tagged release.',
    candidateLogin: 'sofia-ml',
    repositories: [repo],
    evidence,
    expectedSkills: [
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
        expectedEvidenceIds: idsByPredicate(
          (e) => e.title.toLowerCase().includes('docker') || e.source_type === 'release',
        ),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.title.toLowerCase().includes('fix')),
      },
      {
        skillSlug: 'communication-of-reasoning',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsByPredicate((e) => e.source_type === 'review'),
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
    unsupportedSkills: ['frontend-engineering', 'database-design'],
  };
}

function mlSenior03(): GoldenCase {
  const f = createEvidenceFactory('ml-senior-03');
  const repoId = 'repo-recsys-platform';
  const repo = makeRepository(repoId, 'priya-mlops/recsys-platform', 'Python');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A production recommendation platform: training, serving, and monitoring.',
    primaryLanguage: 'Python',
    daysAgo: 400,
    hasReadme: true,
    ownerLogin: 'priya-mlops',
  });

  const commitSpecs: readonly [string, string][] = [
    ['serving/model_server.py', 'Optimize model server batching to cut p99 inference latency'],
    ['serving/model_server_test.py', 'Add load tests for model server batching'],
    ['monitoring/drift_detector.py', 'Add feature-drift detection with alerting'],
    ['.github/workflows/deploy.yml', 'Add canary deploy for model rollouts'],
    ['Dockerfile', 'Add reproducible training and serving images'],
    ['serving/model_server.py', 'Fix memory leak in long-running batch worker'],
    ['docs/architecture.md', 'Document training-to-serving data flow and rollback plan'],
  ];
  const commits = commitSpecs.map(([path, message], i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 380 - i * 30,
      authorLogin: 'priya-mlops',
      files: [{ path, additions: 65, deletions: 10, status: 'modified' }],
    }),
  );

  const pullRequests = [
    'Add drift detection and alerting',
    'Add canary deploys for model rollouts',
  ].map((title, i) => {
    const n = i + 1;
    return f.pullRequest({
      repositoryId: repoId,
      number: n,
      title,
      daysAgo: 300 - n * 40,
      merged: true,
      additions: 180,
      deletions: 20,
      changedFiles: 6,
      reviewCount: 1,
      authorLogin: 'priya-mlops',
    });
  });

  const review = f.review({
    repositoryId: repoId,
    pullRequestNumber: 3,
    daysAgo: 150,
    state: 'APPROVED',
    authorLogin: 'priya-mlops',
  });

  const releases = ['v2.0.0', 'v2.1.0'].map((tag, i) =>
    f.release({ repositoryId: repoId, tag, daysAgo: 90 - i * 30, authorLogin: 'priya-mlops' }),
  );

  const issue = f.issue({
    repositoryId: repoId,
    number: 8,
    title: 'Model server OOMs under sustained peak load',
    daysAgo: 200,
    state: 'closed',
    authorLogin: 'priya-mlops',
  });

  const evidence = [repoEvidence, ...commits, ...pullRequests, review, ...releases, issue];
  const idsByPredicate = (predicate: (e: (typeof evidence)[number]) => boolean) =>
    evidence.filter(predicate).map((e) => e.id);

  return {
    id: 'ml-senior-03',
    archetype: 'ml',
    description:
      'Senior MLOps engineer: a production recommendation platform with monitoring and safe rollouts.',
    candidateLogin: 'priya-mlops',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'system-reasoning',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('optimize') ||
            e.title.toLowerCase().includes('drift') ||
            e.source_type === 'repository',
        ),
      },
      {
        skillSlug: 'deployment-operability',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'high',
        expectedEvidenceIds: idsByPredicate(
          (e) =>
            e.title.toLowerCase().includes('deploy') ||
            e.title.toLowerCase().includes('canary') ||
            e.source_type === 'release',
        ),
      },
      {
        skillSlug: 'testing',
        expectedLevel: 'strong',
        expectedConfidenceBand: 'moderate',
        expectedEvidenceIds: idsByPredicate(
          (e) => e.title.toLowerCase().includes('test') || e.title.toLowerCase().includes('load'),
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
            e.title.toLowerCase().includes('leak'),
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
    unsupportedSkills: ['frontend-engineering', 'database-design'],
  };
}

export const mlCases: readonly GoldenCase[] = [mlJunior01(), mlMid02(), mlSenior03()];
