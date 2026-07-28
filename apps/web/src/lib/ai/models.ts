/**
 * Model selection per task type.
 *
 * CLAUDE.md §17.2: "Model IDs live in config, not code" — upgrading a model
 * is one edit here plus an eval run, never a grep-and-replace across
 * features. Each task declares its own model so a low-stakes utility task
 * can be downgraded without touching evaluation-quality work.
 *
 * Per ADR-010 (GitHub Models migration): there is no `effort`/reasoning-depth
 * parameter on this endpoint shape (GitHub Models' OpenAI-compatible Chat
 * Completions API) — Anthropic's `effort` field is dropped rather than kept
 * as a no-op that looks like it still does something.
 */

export const AI_TASKS = {
  /**
   * Interpreting normalized engineering evidence into skill assessments.
   * Evaluation-quality: this output is a judgement about a person's career,
   * so it runs on the strongest available model. Cost is not the deciding
   * variable here (CLAUDE.md §1 — correctness outranks speed).
   */
  skillAssessment: {
    model: 'openai/gpt-5',
    maxTokens: 16_000,
  },
} as const satisfies Record<
  string,
  {
    readonly model: string;
    readonly maxTokens: number;
  }
>;

export type AiTaskName = keyof typeof AI_TASKS;
