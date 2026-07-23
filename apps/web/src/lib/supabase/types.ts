/**
 * Placeholder for Supabase-generated database types.
 *
 * Replace this file's contents by running codegen against the project's
 * Postgres schema once `prisma/schema.prisma` (CLAUDE.md §3, §15) has real
 * tables:
 *
 *   npx supabase gen types typescript --project-id <project-ref> \
 *     > src/lib/supabase/types.ts
 *
 * Every client in this module (`client.ts`, `server.ts`, `admin.ts`,
 * `middleware.ts`) imports `Database` from this file and only this file —
 * no other path — so re-running codegen is a pure overwrite, never a
 * refactor. The shape below matches the generator's real output shape
 * (`Tables` / `Views` / `Functions` / `Enums` / `CompositeTypes`) so a
 * schema with real tables drops in without touching any client file.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
