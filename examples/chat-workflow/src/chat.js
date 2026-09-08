/** @typedef {'user' | 'assistant' | 'system' | 'step'} MsgRole */

/**
 * @param {HTMLElement} root
 */
export function createChat(root) {
  /** @type {{ role: MsgRole, text: string }[]} */
  const messages = [];

  function render() {
    root.innerHTML = '';
    for (const msg of messages) {
      const el = document.createElement('article');
      el.className = `msg ${msg.role}`;
      const role = document.createElement('span');
      role.className = 'role';
      role.textContent =
        msg.role === 'user'
          ? 'You'
          : msg.role === 'assistant'
            ? 'Assistant'
            : msg.role === 'step'
              ? 'Workflow step'
              : 'Session';
      const body = document.createElement('div');
      body.textContent = msg.text;
      el.append(role, body);
      root.appendChild(el);
    }
    root.scrollTop = root.scrollHeight;
  }

  /**
   * @param {MsgRole} role
   * @param {string} text
   */
  function push(role, text) {
    messages.push({ role, text });
    render();
  }

  function clear() {
    messages.length = 0;
    render();
  }

  function seed() {
    clear();
    push(
      'system',
      'This chat session owns the workflow on the right. Edit the graph, then Run — steps stream here as one assistant turn.'
    );
    push('user', 'Summarize today’s risks and draft a reply to the client.');
    push(
      'assistant',
      'Attach tools on the canvas (retrieve notes → draft → reply). Hit Run workflow when ready.'
    );
  }

  return { push, clear, seed, getMessages: () => messages.slice() };
}
