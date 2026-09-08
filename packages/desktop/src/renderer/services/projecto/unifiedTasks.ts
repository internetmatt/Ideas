/**
 * Unified scheduled-task view across the two schedulers that exist today.
 *
 * Ownership is split by KIND, not by app (decision 2026-09-06):
 *
 *   Ideas    — conversation-scoped tasks. Carry a conversation_id and run a
 *              message against an agent. Authored and executed locally, so
 *              they keep working when Projecto is unreachable.
 *   Projecto — fleet / workspace tasks from the Projecto calendar. Authored
 *              elsewhere (work app, workspace work folder) and surfaced here
 *              read-only; Ideas must not become a second source of truth for
 *              them.
 *
 * The split is deliberate: a single merged store would make one of the two
 * silently authoritative, and the losing side's edits would vanish.
 */

/** Projecto calendar event — GET /api/projecto/calendar/events. */
export interface ProjectoCalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  category?: string | null;
  color?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Minimal shape of a local cron job; mirrors ICronJob's read surface. */
export interface LocalCronJobLike {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  metadata?: { conversation_id?: string; conversation_title?: string; created_at?: number };
}

export type TaskOrigin = 'ideas' | 'projecto';

export interface UnifiedTask {
  /** Namespaced so the two id spaces can never collide in one list. */
  key: string;
  id: string;
  origin: TaskOrigin;
  title: string;
  description?: string;
  /** Ideas tasks can be toggled here; Projecto tasks are read-only. */
  editable: boolean;
  enabled?: boolean;
  startsAt?: string;
  /** Sort key — epoch ms; 0 when the source gives no time. */
  sortAt: number;
  conversationId?: string;
  category?: string;
}

const epoch = (value: string | null | undefined): number => {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
};

/** Projecto-owned: surfaced read-only, never edited from Ideas. */
export const fromCalendarEvent = (event: ProjectoCalendarEvent): UnifiedTask => ({
  key: `projecto:${event.id}`,
  id: event.id,
  origin: 'projecto',
  title: event.title || 'Untitled task',
  description: event.description ?? undefined,
  editable: false,
  startsAt: event.startTime ?? undefined,
  sortAt: epoch(event.startTime) || epoch(event.createdAt),
  category: event.category ?? undefined,
});

/** Ideas-owned: fully editable here. */
export const fromLocalCronJob = (job: LocalCronJobLike): UnifiedTask => ({
  key: `ideas:${job.id}`,
  id: job.id,
  origin: 'ideas',
  title: job.name || 'Untitled task',
  description: job.description,
  editable: true,
  enabled: job.enabled,
  sortAt: job.metadata?.created_at ?? 0,
  conversationId: job.metadata?.conversation_id,
});

/**
 * Merge for display. Ideas tasks sort first (they are the ones you can act
 * on), then Projecto tasks; each group newest-first. Ids are namespaced, so a
 * shared id between the two systems does not collapse two distinct tasks.
 */
export const mergeTasks = (
  local: readonly LocalCronJobLike[],
  remote: readonly ProjectoCalendarEvent[]
): UnifiedTask[] => {
  const seen = new Set<string>();
  const all = [...local.map(fromLocalCronJob), ...remote.map(fromCalendarEvent)];
  const unique = all.filter((task) => {
    if (seen.has(task.key)) return false;
    seen.add(task.key);
    return true;
  });
  const rank = (t: UnifiedTask): number => (t.origin === 'ideas' ? 0 : 1);
  return unique.sort((a, b) => rank(a) - rank(b) || b.sortAt - a.sortAt);
};
