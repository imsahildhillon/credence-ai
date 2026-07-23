/**
 * Runs once when the server instance starts, before any request is handled.
 * Importing `env` here triggers its fail-fast Zod validation at boot rather
 * than lazily on first use inside a request handler.
 *
 * Next.js does not itself terminate the process when `register()` throws —
 * it logs the error but leaves the server bound to its port, serving 500s
 * for every request. That's an invisible failure mode for anything
 * watching process liveness rather than response codes. We log clearly and
 * exit non-zero ourselves so a misconfigured deployment is unambiguously
 * down, not silently broken.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('@/config/env');
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
