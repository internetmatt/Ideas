/**
 * @license
 * Copyright 2026 Ideas / Ideus
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin DTO bridge: Ideas cowork conversation ↔ AskDilly-Core Chat Hub session.
 *
 * This is not a runtime client. A later Core ↔ Ideas bridge (parallel to
 * PLAT-245 / OpenIdeas canvas swap) can import these shapes without rewriting
 * AionUi conversation storage.
 *
 * Naming overlap with Core:
 * - **Chat Hub** (Core `/home/chat`) ↔ Ideas conversation list (WebUI :3011)
 * - **Agents** is shared chrome language. Core `/home/agents` redirects to
 *   workflows; Ideas Agents are local/remote coding agents. Do not treat them
 *   as the same object.
 */

import { AGENTS_NAME, CHAT_HUB_NAME } from '@/common/branding';

export { AGENTS_NAME, CHAT_HUB_NAME };

/** Core Chat Hub session fields we can round-trip without pulling @dilly/api-types. */
export type CoreChatHubSessionDto = {
  id: string;
  title: string;
  ownerId: string;
  chatProjectId: string | null;
  pinned: boolean;
  pinnedAt: string | null;
  lastMessageAt: string | null;
  workflowId: string | null;
  agentId: string | null;
  agentName: string;
  createdAt: string;
  updatedAt: string;
};

/** Ideas-side pointer — subset of TChatConversation used for a future bridge. */
export type IdeasConversationHubPointer = {
  conversationId: string;
  title: string;
  pinned: boolean;
  pinnedAt: number | null;
  agentName: string | null;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type IdeasConversationHubInput = {
  id: string;
  name: string;
  created_at: number;
  modified_at: number;
  project_id?: string;
  extra?: {
    pinned?: boolean;
    pinned_at?: number;
    agent_name?: string;
  };
};

function toIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

export function coreSessionFromIdeasConversation(
  conversation: IdeasConversationHubInput,
  ownerId = ''
): CoreChatHubSessionDto {
  const pinned = conversation.extra?.pinned === true;
  const pinnedAtMs = pinned ? (conversation.extra?.pinned_at ?? conversation.modified_at) : null;
  return {
    id: conversation.id,
    title: conversation.name,
    ownerId,
    chatProjectId: conversation.project_id ?? null,
    pinned,
    pinnedAt: toIso(pinnedAtMs),
    lastMessageAt: toIso(conversation.modified_at),
    workflowId: null,
    agentId: null,
    agentName: conversation.extra?.agent_name ?? '',
    createdAt: toIso(conversation.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIso(conversation.modified_at) ?? new Date(0).toISOString(),
  };
}

export function ideasPointerFromCoreSession(session: CoreChatHubSessionDto): IdeasConversationHubPointer {
  const pinnedAt = session.pinnedAt ? Date.parse(session.pinnedAt) : NaN;
  const createdAt = Date.parse(session.createdAt);
  const updatedAt = Date.parse(session.updatedAt);
  return {
    conversationId: session.id,
    title: session.title,
    pinned: session.pinned,
    pinnedAt: session.pinned && Number.isFinite(pinnedAt) ? pinnedAt : null,
    agentName: session.agentName || null,
    projectId: session.chatProjectId,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

/** Ideas conversations are Chat Hub sessions, not OpenIdeas canvas rows. */
export function isChatHubCompatibleConversation(conversation: IdeasConversationHubInput | null | undefined): boolean {
  return Boolean(conversation?.id?.trim() && conversation.name != null);
}
