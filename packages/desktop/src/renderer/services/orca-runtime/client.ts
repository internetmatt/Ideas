export type PairingOffer = {
  v: 2;
  endpoint: string;
  deviceToken: string;
  publicKeyB64: string;
  scope: 'runtime';
  pairingId?: string;
  expiresAt?: string;
};

export type RuntimeRpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: { code: string; message: string } };

type ProjectoIntegrations = {
  orcaRuntimeUrl?: string;
};

function resolveRuntimeBase(explicit = ''): string {
  if (explicit) return explicit.replace(/\/$/, '');
  if (typeof window === 'undefined') return '';
  const integ = (window as Window & { __PROJECTO_INTEGRATIONS__?: ProjectoIntegrations }).__PROJECTO_INTEGRATIONS__;
  if (integ?.orcaRuntimeUrl) return integ.orcaRuntimeUrl.replace(/\/$/, '');
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && !('electronAPI' in window)) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:4715';
}

/**
 * Thin HTTP + WS client for Projecto's orca-runtime-adapter.
 * Talks to `:6768` via the Projecto backend proxy (`/api/projecto/orca-runtime/*`).
 */
export class OrcaRuntimeClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: RuntimeRpcResponse) => void; reject: (e: Error) => void }>();
  private seq = 0;
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = resolveRuntimeBase(baseUrl);
  }

  private api(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async health(): Promise<{ ok: boolean; live?: boolean; ready?: boolean }> {
    const res = await fetch(this.api('/api/projecto/orca-runtime/health'), {
      credentials: 'include',
    });
    return (await res.json()) as { ok: boolean; live?: boolean; ready?: boolean };
  }

  async createPairing(): Promise<PairingOffer> {
    const res = await fetch(this.api('/api/projecto/orca-runtime/pairings'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`pairing failed: HTTP ${res.status}`);
    const json = (await res.json()) as { ok?: boolean; offer?: PairingOffer };
    if (!json.offer) throw new Error('pairing offer missing');
    return json.offer;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    const offer = await this.createPairing();
    const endpoint = offer.endpoint.includes('://') ? offer.endpoint : this.api('/api/projecto/orca-runtime/ws');
    const origin =
      this.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:4715');
    const url = new URL(endpoint, origin);
    url.searchParams.set('deviceToken', offer.deviceToken);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url.toString());
      ws.binaryType = 'arraybuffer';
      ws.addEventListener('open', () => {
        this.ws = ws;
        resolve();
      });
      ws.addEventListener('error', () => reject(new Error('runtime websocket failed')));
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        try {
          const frame = JSON.parse(ev.data) as RuntimeRpcResponse & { _keepalive?: boolean };
          if (frame && '_keepalive' in frame) return;
          const pending = this.pending.get(frame.id);
          if (pending) {
            this.pending.delete(frame.id);
            pending.resolve(frame);
          }
        } catch {
          /* ignore non-RPC frames */
        }
      });
      ws.addEventListener('close', () => {
        this.ws = null;
        for (const [, p] of this.pending) {
          p.reject(new Error('runtime disconnected'));
        }
        this.pending.clear();
      });
    });
  }

  async call(method: string, params: unknown = {}): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    const id = `ideas-${++this.seq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 30_000);
      this.pending.set(id, {
        resolve: (frame) => {
          clearTimeout(timer);
          if (!frame.ok) {
            reject(new Error(frame.error.message || frame.error.code));
            return;
          }
          resolve(frame.result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
