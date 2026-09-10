# Cowork Acquisition & Revenue Sync

Updated: 2026-09-10

## Role of this repo

`internetmatt/Ideas` owns the user-facing **Idea/session + Cowork** experience.

Canonical mapping:

- **Ideas** = AIONUI-style idea/session surface and Cowork inbox.
- **OpenIdeas** = Flowise-style reusable flows/workflows attached to ideas, assistants, campaigns, and acquisition paths.
- **Projecto** = runtime/event-bus/orchestration layer.
- **Google Drive OpenIdea Vault** = cross-repo operating context, specs, reviews, roadmaps, and handoffs.

## Cowork event contract

External sources such as Instagram, YouTube, TikTok, websites, email, and approved first-party analytics should be normalized into Cowork events.

```ts
export type AcquisitionStrategy =
  | "user"
  | "service"
  | "merch"
  | "royalty";

export type CoworkEventKind =
  | "message"
  | "comment"
  | "mention"
  | "follow"
  | "content"
  | "lead"
  | "order"
  | "royalty"
  | "commission";

export interface CoworkEvent {
  id: string;
  source: "instagram" | "youtube" | "tiktok" | "web" | "email";
  accountId: string;
  actorId?: string;
  kind: CoworkEventKind;
  acquisition?: AcquisitionStrategy;
  ideaId?: string;
  conversationId?: string;
  contentId?: string;
  campaignId?: string;
  occurredAt: string;
  payload: unknown;
}
```

## Cowork UX

Cowork should be one normalized operational stream rather than a clone of every native social inbox.

Suggested filters:

- Inbox
- Leads
- Content
- Orders
- Royalties
- Commissions

Clicking an event should open the related Idea/session and, when available, its attached OpenIdeas workflow.

## Profit strategies

The system should support four explicit profit/acquisition paths:

1. `user` — viewer/follower → registered user, subscriber, member, SaaS user, or digital-product customer.
2. `service` — viewer/contact → qualified lead → consultation, SOW, retainer, or project.
3. `merch` — content/audience → purchase → margin, affiliate fee, or creator commission.
4. `royalty` — media/IP usage, licensing, streams, collaborations, or recurring rights revenue.

Projecto should optimize toward attributed revenue/profit; views, followers, and engagement remain leading indicators.

## Initial account graph

Business/client nodes:

- Revolution Speed
- Computer Zone Marietta
- Calo Landscape
- Boxframebilly

Creator/media nodes:

- YEB Show
- Corey Vintage
- Brixx Bryson
- Boxframebilly
- additional approved creator accounts

## Shared entities

`Creator`, `Brand`, `Account`, `Audience`, `Idea`, `OpenIdea`, `ContentAsset`, `Campaign`, `Offer`, `Product`, `Service`, `Lead`, `Customer`, `Conversion`, `Commission`, `Royalty`, `Payout`, `Expense`, `Revenue`, `Profit`, `Attribution`.

## Implementation slice

Prove one source/account end-to-end:

`adapter -> Projecto event bus -> identity resolver -> Cowork store/API -> Ideas Cowork UI -> attached OpenIdeas flow`

Only broaden source coverage after that path is working and observable.

## Boundary

Use authorized/public activity and first-party analytics. Do not depend on private scraping or inaccessible platform data.
