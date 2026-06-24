let rawVisible = false;

function toggleRaw() {
  rawVisible = !rawVisible;
  document.getElementById('rawJson').style.display = rawVisible ? 'block' : 'none';
}

async function submit() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const raw = document.getElementById('inputData').value;
  const errorBox = document.getElementById('errorBox');
  const responseDiv = document.getElementById('response');
  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');

  // Parse input: split by comma or newline
  const entries = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  if (!apiUrl) { showError('Please enter your API URL above.'); return; }
  if (entries.length === 0) { showError('Please enter at least one node edge.'); return; }

  // Loading state
  errorBox.style.display = 'none';
  responseDiv.style.display = 'none';
  btn.disabled = true;
  btnText.textContent = 'Analysing';
  spinner.style.display = 'block';

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: entries }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    renderResponse(data);
    responseDiv.style.display = 'block';
    rawVisible = false;
    document.getElementById('rawJson').style.display = 'none';
  } catch (e) {
    showError(`API call failed: ${e.message}`);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Analyse';
    spinner.style.display = 'none';
  }
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = msg;
  box.style.display = 'block';
}

function renderResponse(data) {
  // Summary stats
  const sg = document.getElementById('summaryGrid');
  sg.innerHTML = `
    <div class="stat-card">
      <div class="val">${data.summary.total_trees}</div>
      <div class="lbl">Valid Trees</div>
    </div>
    <div class="stat-card">
      <div class="val">${data.summary.total_cycles}</div>
      <div class="lbl">Cyclic Groups</div>
    </div>
    <div class="stat-card">
      <div class="val">${data.summary.largest_tree_root || '—'}</div>
      <div class="lbl">Deepest Tree Root</div>
    </div>
    <div class="stat-card">
      <div class="val">${data.invalid_entries.length}</div>
      <div class="lbl">Invalid Entries</div>
    </div>
  `;

  // Hierarchies
  const hg = document.getElementById('hierGrid');
  document.getElementById('hierCount').textContent = data.hierarchies.length;
  hg.innerHTML = data.hierarchies.map(h => {
    const isCycle = !!h.has_cycle;
    const badge = isCycle
      ? `<span class="cycle-badge">⚡ CYCLE</span>`
      : `<span class="depth-badge">depth ${h.depth}</span>`;

    const treeHtml = isCycle
      ? `<div class="cycle-msg">↺ Cyclic — no tree structure</div>`
      : renderTree(h.tree);

    return `
      <div class="hier-card ${isCycle ? 'cyclic' : ''}">
        <div class="hier-card-head">
          <div class="root-badge">${h.root}</div>
          <div class="meta">
            <div class="title">Root: ${h.root}</div>
            <div class="sub">${isCycle ? 'Cyclic group' : `Longest path: ${h.depth} node${h.depth !== 1 ? 's' : ''}`}</div>
          </div>
          ${badge}
        </div>
        <div class="tree-view">${treeHtml}</div>
      </div>
    `;
  }).join('');

  // Invalid
  const it = document.getElementById('invalidTags');
  document.getElementById('invalidCount').textContent = data.invalid_entries.length;
  it.innerHTML = data.invalid_entries.length
    ? data.invalid_entries.map(e => `<span class="tag invalid">${escHtml(e) || '(empty)'}</span>`).join('')
    : '<span class="empty-msg">None</span>';

  // Duplicates
  const dt = document.getElementById('dupTags');
  document.getElementById('dupCount').textContent = data.duplicate_edges.length;
  dt.innerHTML = data.duplicate_edges.length
    ? data.duplicate_edges.map(e => `<span class="tag dup">${escHtml(e)}</span>`).join('')
    : '<span class="empty-msg">None</span>';

  // Raw JSON
  document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/** Render the nested tree object as a visual ASCII-style tree */
function renderTree(treeObj, prefix = '', isLast = true, isRoot = true) {
  const entries = Object.entries(treeObj);
  if (entries.length === 0) return '';

  let html = '';
  entries.forEach(([node, children], idx) => {
    const last = idx === entries.length - 1;
    const connector = isRoot ? '' : (last ? '└─ ' : '├─ ');
    const hasKids = Object.keys(children).length > 0;
    const nodeClass = hasKids ? 'tree-node' : 'tree-node leaf';

    html += `<div class="tree-line">
      <span class="tree-prefix">${escHtml(prefix)}${escHtml(connector)}</span>
      <span class="${nodeClass}">${escHtml(node)}</span>
    </div>`;

    if (hasKids) {
      const newPrefix = isRoot ? '' : prefix + (last ? '   ' : '│  ');
      html += renderTree(children, newPrefix, last, false);
    }
  });
  return html;
}

// Allow Ctrl+Enter to submit
document.getElementById('inputData').addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') submit();
});

// Expose submit and toggleRaw to global scope for inline handlers
window.submit = submit;
window.toggleRaw = toggleRaw;
