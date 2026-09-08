import { createChat } from './chat.js';
import { createWorkflow } from './workflow.js';

const transcript = document.querySelector('#transcript');
const canvas = document.querySelector('#canvas');
const edges = document.querySelector('#edges');
const composer = document.querySelector('#composer');
const input = document.querySelector('#composer-input');
const btnRun = document.querySelector('#btn-run');
const btnReset = document.querySelector('#btn-reset');
const status = document.querySelector('#workflow-status');
const palette = document.querySelector('#palette');

if (
  !(transcript instanceof HTMLElement) ||
  !(canvas instanceof HTMLElement) ||
  !(edges instanceof SVGSVGElement) ||
  !(composer instanceof HTMLFormElement) ||
  !(input instanceof HTMLTextAreaElement) ||
  !(btnRun instanceof HTMLButtonElement) ||
  !(btnReset instanceof HTMLButtonElement) ||
  !(status instanceof HTMLElement) ||
  !(palette instanceof HTMLElement)
) {
  throw new Error('Prototype markup missing required elements');
}

const chat = createChat(transcript);
const workflow = createWorkflow(canvas, edges);

chat.seed();

palette.addEventListener('click', (ev) => {
  const target = ev.target;
  if (!(target instanceof HTMLElement)) return;
  const type = target.dataset.node;
  if (!type) return;
  if (type === 'llm' || type === 'tool' || type === 'branch' || type === 'reply') {
    workflow.addNode(type);
  }
});

composer.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  chat.push('user', text);
  input.value = '';
  chat.push(
    'assistant',
    'Got it — I will use the attached session workflow on the next Run (or edit the graph first).'
  );
});

btnReset.addEventListener('click', () => {
  workflow.seed();
  chat.seed();
  setStatus('workflow idle', false);
});

btnRun.addEventListener('click', async () => {
  if (btnRun.disabled) return;
  btnRun.disabled = true;
  setStatus('workflow running', true);

  const order = workflow.executionOrder();
  if (order.length === 0) {
    chat.push('system', 'No runnable path from Session input.');
    btnRun.disabled = false;
    setStatus('workflow idle', false);
    return;
  }

  const latestUser =
    [...chat.getMessages()].reverse().find((m) => m.role === 'user')?.text ??
    '(empty session message)';

  chat.push('step', `Starting run for: “${latestUser}”`);

  let prevId = null;
  for (const node of order) {
    const edgeId = prevId ? workflow.edgeBetween(prevId, node.id) : null;
    workflow.highlight(node.id, edgeId ? [edgeId] : []);
    chat.push('step', `${labelFor(node.type)} · ${node.title}\n${describeStep(node, latestUser)}`);
    await wait(700);
    prevId = node.id;
  }

  workflow.clearHighlight();
  workflow.highlight(null, []);
  chat.push(
    'assistant',
    draftReply(latestUser, order)
  );
  setStatus('workflow idle', false);
  btnRun.disabled = false;
});

/**
 * @param {string} text
 * @param {boolean} running
 */
function setStatus(text, running) {
  status.textContent = text;
  status.classList.toggle('running', running);
}

/**
 * @param {import('./workflow.js').NodeType | string} type
 */
function labelFor(type) {
  switch (type) {
    case 'session':
      return 'Input';
    case 'llm':
      return 'LLM';
    case 'tool':
      return 'Tool';
    case 'branch':
      return 'Branch';
    case 'reply':
      return 'Reply';
    default:
      return 'Node';
  }
}

/**
 * @param {{ type: string, title: string, detail: string }} node
 * @param {string} userText
 */
function describeStep(node, userText) {
  if (node.type === 'session') return `Bound chat context → graph\n${truncate(userText, 120)}`;
  if (node.type === 'llm') return 'Reasoning over session messages and prior tool results…';
  if (node.type === 'tool') return `Executing ${node.title}…`;
  if (node.type === 'branch') return 'Choosing path from confidence / intent…';
  if (node.type === 'reply') return 'Composing assistant message into this chat…';
  return node.detail;
}

/**
 * @param {string} userText
 * @param {{ type: string, title: string }[]} order
 */
function draftReply(userText, order) {
  const tools = order.filter((n) => n.type === 'tool').map((n) => n.title);
  const toolLine = tools.length
    ? `Used: ${tools.join(', ')}.`
    : 'No tools on this path — pure LLM draft.';
  return (
    `Here’s a session-bound reply shaped by the attached workflow.\n\n` +
    `Request: ${truncate(userText, 160)}\n` +
    `${toolLine}\n\n` +
    `Draft: Thanks for the update — I’ve reviewed the notes on this thread, ` +
    `flagged the top risks, and outlined a clear next step for the client. ` +
    `(Prototype output — swap this runner for Flowise buildChatflow / agentflow.)`
  );
}

/**
 * @param {string} value
 * @param {number} max
 */
function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/**
 * @param {number} ms
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
