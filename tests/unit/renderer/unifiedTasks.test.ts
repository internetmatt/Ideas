import { describe, expect, it } from 'vitest';
import {
  fromCalendarEvent,
  fromLocalCronJob,
  mergeTasks,
  type LocalCronJobLike,
  type ProjectoCalendarEvent,
} from '@/renderer/services/projecto/unifiedTasks';

const event = (over: Partial<ProjectoCalendarEvent> = {}): ProjectoCalendarEvent => ({
  id: 'e1',
  title: 'M1 verify event',
  startTime: '2026-07-17T18:00:00Z',
  createdAt: '2026-07-17T21:57:46.971Z',
  ...over,
});

const job = (over: Partial<LocalCronJobLike> = {}): LocalCronJobLike => ({
  id: 'j1',
  name: 'Daily digest',
  enabled: true,
  metadata: { conversation_id: 'c1', created_at: 1_800_000_000_000 },
  ...over,
});

describe('ownership split (option C)', () => {
  it('marks Projecto tasks read-only — Ideas must not become a second source of truth', () => {
    const t = fromCalendarEvent(event());
    expect(t.origin).toBe('projecto');
    expect(t.editable).toBe(false);
  });

  it('marks Ideas tasks editable and keeps their conversation link', () => {
    const t = fromLocalCronJob(job());
    expect(t.origin).toBe('ideas');
    expect(t.editable).toBe(true);
    expect(t.conversationId).toBe('c1');
  });
});

describe('merge', () => {
  it('namespaces ids so a shared id is not collapsed into one task', () => {
    const merged = mergeTasks([job({ id: 'same' })], [event({ id: 'same' })]);
    expect(merged).toHaveLength(2);
    expect(merged.map((t) => t.key)).toEqual(['ideas:same', 'projecto:same']);
  });

  it('puts actionable Ideas tasks first, then Projecto', () => {
    const merged = mergeTasks([job()], [event()]);
    expect(merged.map((t) => t.origin)).toEqual(['ideas', 'projecto']);
  });

  it('sorts newest-first inside each group', () => {
    const merged = mergeTasks(
      [job({ id: 'old', metadata: { created_at: 1 } }), job({ id: 'new', metadata: { created_at: 2 } })],
      []
    );
    expect(merged.map((t) => t.id)).toEqual(['new', 'old']);
  });

  it('falls back to createdAt when an event has no start time', () => {
    expect(fromCalendarEvent(event({ startTime: null })).sortAt).toBeGreaterThan(0);
  });

  it('survives unparseable and missing times rather than producing NaN', () => {
    expect(fromCalendarEvent(event({ startTime: 'not-a-date', createdAt: null })).sortAt).toBe(0);
    expect(fromLocalCronJob(job({ metadata: undefined })).sortAt).toBe(0);
  });

  it('never shows an empty title', () => {
    expect(fromCalendarEvent(event({ title: '' })).title).toBe('Untitled task');
    expect(fromLocalCronJob(job({ name: '' })).title).toBe('Untitled task');
  });

  it('handles both sides being empty', () => {
    expect(mergeTasks([], [])).toEqual([]);
  });
});
