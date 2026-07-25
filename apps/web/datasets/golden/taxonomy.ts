import type { SkillRow } from '@/features/analysis/aggregator';

/**
 * A frozen copy of the fixed V1 skill taxonomy.
 *
 * The evaluation framework never touches Supabase (CLAUDE.md §22.6 — LLM
 * calls, and by extension this eval, must not depend on live infrastructure
 * to stay fast, portable, and CI-safe), so this mirrors
 * `supabase/migrations/20260723091743_create_skills.sql` by value. It is
 * product reference data that changes only when the taxonomy migration
 * changes — keep the two in sync by hand if that migration is ever amended.
 */
export const GOLDEN_TAXONOMY: readonly SkillRow[] = [
  {
    slug: 'api-design',
    name: 'API design',
    description: 'Designing clear, consistent, well-structured APIs.',
  },
  {
    slug: 'data-modeling',
    name: 'Data modeling',
    description: 'Structuring data and relationships soundly for the problem at hand.',
  },
  {
    slug: 'testing',
    name: 'Testing',
    description: 'Automated test coverage and testing discipline.',
  },
  {
    slug: 'debugging-problem-solving',
    name: 'Debugging & problem-solving',
    description: 'Diagnosing and resolving real issues methodically.',
  },
  {
    slug: 'code-quality-readability',
    name: 'Code quality & readability',
    description: 'Clear, maintainable, well-organized code.',
  },
  {
    slug: 'system-reasoning',
    name: 'System reasoning',
    description: 'Reasoning about trade-offs, architecture, and failure modes.',
  },
  {
    slug: 'deployment-operability',
    name: 'Deployment & operability',
    description: 'Shipping and running software reliably.',
  },
  {
    slug: 'version-control-practice',
    name: 'Version-control practice',
    description: 'Commit hygiene and incremental, well-documented development.',
  },
  {
    slug: 'communication-of-reasoning',
    name: 'Communication of technical reasoning',
    description: 'Explaining decisions and trade-offs clearly.',
  },
  {
    slug: 'frontend-engineering',
    name: 'Frontend engineering',
    description: 'Building usable, correct user interfaces.',
  },
  {
    slug: 'backend-service-design',
    name: 'Backend service design',
    description: 'Structuring backend services and their boundaries.',
  },
  {
    slug: 'database-design',
    name: 'Database design',
    description: 'Schema design, indexing, and query performance.',
  },
] as const;
