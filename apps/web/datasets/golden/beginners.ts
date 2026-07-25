import type { GoldenCase } from '@/features/evaluation/types';

import { createEvidenceFactory, makeRepository } from './fixtures';

function beginner01(): GoldenCase {
  const f = createEvidenceFactory('beginner-01');
  const repoId = 'repo-todo-cli';
  const repo = makeRepository(repoId, 'noah-learn/todo-cli', 'JavaScript');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A command-line todo list, first project.',
    primaryLanguage: 'JavaScript',
    daysAgo: 30,
    hasReadme: true,
    ownerLogin: 'noah-learn',
  });

  const commits = ['Initial commit', 'Add list command', 'Add done command'].map((message, i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 28 - i * 8,
      files: [{ path: 'index.js', additions: 20, deletions: 0, status: 'modified' }],
    }),
  );

  const evidence = [repoEvidence, ...commits];

  return {
    id: 'beginner-01',
    archetype: 'beginner',
    description: 'True beginner: one tiny CLI project, three commits, no tests, no PRs.',
    candidateLogin: 'noah-learn',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'not_yet_assessed',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'not_yet_assessed',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
    ],
    // Four evidence items on one script cannot ground a "strong" or even
    // confidently "developing" claim on skills this far from what happened.
    unsupportedSkills: [
      'backend-service-design',
      'database-design',
      'testing',
      'deployment-operability',
    ],
  };
}

function beginner02(): GoldenCase {
  const f = createEvidenceFactory('beginner-02');
  const repoId = 'repo-react-tutorial';
  const repo = makeRepository(repoId, 'amy-first/react-tutorial', 'JavaScript');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'Following along with a public React tutorial.',
    primaryLanguage: 'JavaScript',
    daysAgo: 20,
    hasReadme: false,
    ownerLogin: 'amy-first',
  });

  const commits = ['Create React App', 'Add counter component'].map((message, i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 18 - i * 6,
      files: [{ path: 'src/App.js', additions: 15, deletions: 0, status: 'modified' }],
    }),
  );

  const evidence = [repoEvidence, ...commits];

  return {
    id: 'beginner-02',
    archetype: 'beginner',
    description: 'Beginner following a public tutorial: minimal original evidence.',
    candidateLogin: 'amy-first',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'frontend-engineering',
        expectedLevel: 'not_yet_assessed',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: evidence.map((e) => e.id),
      },
    ],
    unsupportedSkills: [
      'backend-service-design',
      'database-design',
      'code-quality-readability',
      'testing',
    ],
  };
}

function beginner03(): GoldenCase {
  const f = createEvidenceFactory('beginner-03');
  const repoId = 'repo-calculator';
  const repo = makeRepository(repoId, 'diego-new/calculator', 'Python');

  const repoEvidence = f.repository({
    repositoryId: repoId,
    fullName: repo.fullName,
    description: 'A basic calculator script.',
    primaryLanguage: 'Python',
    daysAgo: 45,
    hasReadme: true,
    ownerLogin: 'diego-new',
  });

  const commits = [
    'Add addition and subtraction',
    'Add multiplication and division',
    'Handle division by zero',
    'Clean up variable names',
    'Add basic CLI prompt',
  ].map((message, i) =>
    f.commit({
      repositoryId: repoId,
      sha: `c${i + 1}`,
      message,
      daysAgo: 42 - i * 7,
      files: [{ path: 'calculator.py', additions: 12, deletions: 3, status: 'modified' }],
    }),
  );

  const pullRequest = f.pullRequest({
    repositoryId: repoId,
    number: 1,
    title: 'Add division-by-zero handling',
    daysAgo: 20,
    merged: true,
    additions: 15,
    deletions: 2,
    changedFiles: 1,
  });

  const evidence = [repoEvidence, ...commits, pullRequest];
  const idsFor = (indexes: readonly number[]) => indexes.map((i) => evidence[i]!.id);

  return {
    id: 'beginner-03',
    archetype: 'beginner',
    description:
      'Beginner with a bit more iteration: one small merged PR, a defensive fix, a cleanup pass.',
    candidateLogin: 'diego-new',
    repositories: [repo],
    evidence,
    expectedSkills: [
      {
        skillSlug: 'code-quality-readability',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([4]),
      },
      {
        skillSlug: 'debugging-problem-solving',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([3, 6]),
      },
      {
        skillSlug: 'version-control-practice',
        expectedLevel: 'developing',
        expectedConfidenceBand: 'preliminary',
        expectedEvidenceIds: idsFor([6]),
      },
    ],
    unsupportedSkills: ['backend-service-design', 'database-design', 'system-reasoning'],
  };
}

export const beginnerCases: readonly GoldenCase[] = [beginner01(), beginner02(), beginner03()];
