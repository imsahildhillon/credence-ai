import type { OutputConfig } from '@anthropic-ai/sdk/resources/messages';

/**
 * Model and effort selection per task type.
 *
 * CLAUDE.md §17.2: "Model IDs live in config, not code" — upgrading a model
 * is one edit here plus an eval run, never a grep-and-replace across
 * features. Each task declares its own model so a low-stakes utility task
 * can be downgraded without touching evaluation-quality work.
 */

export const AI_TASKS = {
  /**
   * Interpreting normalized engineering evidence into skill assessments.
   * Evaluation-quality: this output is a judgement about a person's career,
   * so it runs on the strongest model at high effort. Cost is not the
   * deciding variable here (CLAUDE.md §1 — correctness outranks speed).
   */
  skillAssessment: {
    model: 'claude-opus-4-8',
    effort: 'high',
    maxTokens: 16_000,
  },
} as const satisfies Record<
  string,
  {
    readonly model: string;
    readonly effort: NonNullable<OutputConfig['effort']>;
    readonly maxTokens: number;
  }
>;

export type AiTaskName = keyof typeof AI_TASKS;
