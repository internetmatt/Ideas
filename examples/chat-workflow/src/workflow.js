/**
 * Minimal Flowise-inspired node canvas bound to a session.
 * Drag nodes, click ports to connect, highlight path while running.
 */

/** @typedef {'session' | 'llm' | 'tool' | 'branch' | 'reply'} NodeType */
/** @typedef {{ id: string, type: NodeType, title: string, detail: string, x: number, y: number }} FlowNode */
/** @typedef {{ id: string, from: string, to: string }} FlowEdge */

const TYPE_META = {
  session: { title: 'Session input', detail: 'Latest user message + transcript context' },
  llm: { title: 'LLM reason', detail: 'Plan steps from chat context' },
  tool: { title: 'Tool call', detail: 'Retrieve files / search / API' },
  branch: { title: 'Branch', detail: 'Route by intent or confidence' },
  reply: { title: 'Chat reply', detail: 'Stream final answer into session' },
};

/**
 * @param {HTMLElement} canvas
 * @param {SVGSVGElement} edgesSvg
 * @param {{ onChange?: () => void }} [opts]
 */
export function createWorkflow(canvas, edgesSvg, opts = {}) {
  /** @type {FlowNode[]} */
  let nodes = [];
  /** @type {FlowEdge[]} */
  let edges = [];
  /** @type {string | null} */
  let pendingPort = null;
  /** @type {string | null} */
  let activeNodeId = null;
  /** @type {Set<string>} */
  let activeEdgeIds = new Set();

  let drag = /** @type {null | { id: string, ox: number, oy: number }} */ (null);

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function seed() {
    nodes = [
      {
        id: 'n-session',
        type: 'session',
        ...TYPE_META.session,
        x: 40,
        y: 120,
      },
      {
        id: 'n-llm',
        type: 'llm',
        ...TYPE_META.llm,
        x: 260,
        y: 70,
      },
      {
        id: 'n-tool',
        type: 'tool',
        title: 'Retrieve notes',
        detail: 'Pull project notes & prior emails',
        x: 260,
        y: 210,
      },
      {
        id: 'n-reply',
        type: 'reply',
        ...TYPE_META.reply,
        x: 500,
        y: 140,
      },
    ];
    edges = [
      { id: 'e1', from: 'n-session', to: 'n-llm' },
      { id: 'e2', from: 'n-session', to: 'n-tool' },
      { id: 'e3', from: 'n-llm', to: 'n-reply' },
      { id: 'e4', from: 'n-tool', to: 'n-reply' },
    ];
    pendingPort = null;
    clearHighlight();
    render();
    opts.onChange?.();
  }

  /**
   * @param {NodeType} type
   */
  function addNode(type) {
    if (type === 'session') return;
    const meta = TYPE_META[type];
    const count = nodes.filter((n) => n.type === type).length + 1;
    nodes.push({
      id: uid('n'),
      type,
      title: type === 'tool' ? `Tool ${count}` : meta.title,
      detail: meta.detail,
      x: 80 + (nodes.length % 4) * 40,
      y: 60 + (nodes.length % 5) * 36,
    });
    render();
    opts.onChange?.();
  }

  function clearHighlight() {
    activeNodeId = null;
    activeEdgeIds = new Set();
  }

  /**
   * @param {string | null} nodeId
   * @param {string[]} edgeIds
   */
  function highlight(nodeId, edgeIds = []) {
    activeNodeId = nodeId;
    activeEdgeIds = new Set(edgeIds);
    render();
  }

  function getGraph() {
    return {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
    };
  }

  /**
   * Topological-ish run order from session → sinks.
   * @returns {FlowNode[]}
   */
  function executionOrder() {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const outgoing = /** @type {Record<string, string[]>} */ ({});
    for (const e of edges) {
      outgoing[e.from] ??= [];
      outgoing[e.from].push(e.to);
    }
    const start = nodes.find((n) => n.type === 'session');
    if (!start) return [];
    const seen = new Set();
    const order = [];
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (byId[id]) order.push(byId[id]);
      for (const next of outgoing[id] ?? []) queue.push(next);
    }
    return order;
  }

  function nodeCenter(node) {
    return { x: node.x + 84, y: node.y + 48 };
  }

  function renderEdges() {
    edgesSvg.innerHTML = '';
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const a = byId[edge.from];
      const b = byId[edge.to];
      if (!a || !b) continue;
      const p1 = nodeCenter(a);
      const p2 = nodeCenter(b);
      const midX = (p1.x + p2.x) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`
      );
      path.setAttribute('class', `edge-path${activeEdgeIds.has(edge.id) ? ' active' : ''}`);
      edgesSvg.appendChild(path);
    }
  }

  function render() {
    canvas.innerHTML = '';
    for (const node of nodes) {
      const el = document.createElement('div');
      el.className = `node${activeNodeId === node.id ? ' active' : ''}`;
      el.dataset.type = node.type;
      el.dataset.id = node.id;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.innerHTML = `
        <div class="node-head"><span class="node-dot"></span><span>${escapeHtml(node.title)}</span></div>
        <div class="node-body">${escapeHtml(node.detail)}</div>
        <div class="ports">
          <button type="button" class="port in" data-port="in" data-node="${node.id}" aria-label="Input port"></button>
          <button type="button" class="port out" data-port="out" data-node="${node.id}" aria-label="Output port"></button>
        </div>
      `;
      el.addEventListener('pointerdown', (ev) => {
        if (ev.target instanceof Element && ev.target.closest('.port')) return;
        drag = { id: node.id, ox: ev.clientX - node.x, oy: ev.clientY - node.y };
        el.setPointerCapture(ev.pointerId);
      });
      el.addEventListener('pointermove', (ev) => {
        if (!drag || drag.id !== node.id) return;
        node.x = Math.max(8, ev.clientX - drag.ox - canvas.getBoundingClientRect().left);
        node.y = Math.max(8, ev.clientY - drag.oy - canvas.getBoundingClientRect().top);
        // Reposition without full rebuild for smoothness
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        renderEdges();
      });
      el.addEventListener('pointerup', () => {
        if (drag?.id === node.id) {
          drag = null;
          opts.onChange?.();
        }
      });
      canvas.appendChild(el);
    }

    canvas.querySelectorAll('.port').forEach((port) => {
      port.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const nodeId = port.getAttribute('data-node');
        const kind = port.getAttribute('data-port');
        if (!nodeId || !kind) return;
        if (!pendingPort) {
          pendingPort = `${kind}:${nodeId}`;
          port.classList.add('selected');
          return;
        }
        const [fromKind, fromId] = pendingPort.split(':');
        let from = fromId;
        let to = nodeId;
        if (fromKind === 'in' && kind === 'out') {
          from = nodeId;
          to = fromId;
        } else if (!(fromKind === 'out' && kind === 'in')) {
          pendingPort = null;
          render();
          return;
        }
        if (from !== to && !edges.some((e) => e.from === from && e.to === to)) {
          edges.push({ id: uid('e'), from, to });
        }
        pendingPort = null;
        render();
        opts.onChange?.();
      });
    });

    renderEdges();
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  seed();

  return {
    seed,
    addNode,
    getGraph,
    executionOrder,
    highlight,
    clearHighlight,
    /**
     * @param {string} fromId
     * @param {string} toId
     */
    edgeBetween(fromId, toId) {
      return edges.find((e) => e.from === fromId && e.to === toId)?.id ?? null;
    },
  };
}
