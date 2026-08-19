/**
 * Future-feature UI lock (not NODE_ENV).
 *
 * NEXT_PUBLIC_FUTURE_TASKS=true  → hide future UI (also the default if unset)
 * NEXT_PUBLIC_FUTURE_TASKS=false → show future UI for local/preview
 */
export function futureTasksHidden(): boolean {
  return process.env.NEXT_PUBLIC_FUTURE_TASKS !== 'false';
}

/** Inverse of futureTasksHidden — use to mount gated UI. */
export function showFutureTasks(): boolean {
  return !futureTasksHidden();
}
