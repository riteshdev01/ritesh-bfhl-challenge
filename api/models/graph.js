const { USER_ID, EMAIL_ID, ROLL_NO } = require('../config');

/** Validate a single entry. Returns true if it's a valid X->Y edge. */
function isValid(entry) {
  const trimmed = entry.trim();
  return /^[A-Z]->[A-Z]$/.test(trimmed);
}

function parseEdge(entry) {
  const [parent, child] = entry.trim().split('->');
  return { parent, child };
}

function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = []; // { parent, child }

  for (const raw of data) {
    const trimmed = (raw || '').trim();

    if (/^[A-Z]->[A-Z]$/.test(trimmed) && trimmed[0] === trimmed[3]) {
      invalid_entries.push(raw);
      continue;
    }

    if (!isValid(trimmed)) {
      invalid_entries.push(raw);
      continue;
    }

    const key = trimmed;
    if (seenEdges.has(key)) {
      if (!duplicate_edges.includes(key)) duplicate_edges.push(key);
    } else {
      seenEdges.add(key);
      validEdges.push(parseEdge(trimmed));
    }
  }

  const childParent = {};
  const adj = {};

  for (const { parent, child } of validEdges) {
    if (child in childParent) continue;
    childParent[child] = parent;
    if (!adj[parent]) adj[parent] = [];
    adj[parent].push(child);
  }

  const allNodes = new Set();
  for (const { parent, child } of validEdges) {
    allNodes.add(parent);
    allNodes.add(child);
  }

  const visited = new Set();

  function getComponent(start) {
    const component = new Set();
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      if (component.has(node)) continue;
      component.add(node);
      for (const child of (adj[node] || [])) stack.push(child);
      if (childParent[node]) stack.push(childParent[node]);
    }
    return component;
  }

  const components = [];
  for (const node of allNodes) {
    if (!visited.has(node)) {
      const comp = getComponent(node);
      comp.forEach(n => visited.add(n));
      components.push(comp);
    }
  }

  function hasCycle(nodes) {
    const color = {};
    for (const n of nodes) color[n] = 0;

    function dfs(node) {
      color[node] = 1;
      for (const child of (adj[node] || [])) {
        if (color[child] === 1) return true;
        if (color[child] === 0 && dfs(child)) return true;
      }
      color[node] = 2;
      return false;
    }

    for (const n of nodes) {
      if (color[n] === 0 && dfs(n)) return true;
    }
    return false;
  }

  function buildTree(root) {
    function recurse(node) {
      const children = adj[node] || [];
      const obj = {};
      for (const child of children) {
        obj[child] = recurse(child);
      }
      return obj;
    }
    return { [root]: recurse(root) };
  }

  function calcDepth(root) {
    function dfs(node) {
      const children = adj[node] || [];
      if (children.length === 0) return 1;
      return 1 + Math.max(...children.map(dfs));
    }
    return dfs(root);
  }

  const hierarchies = [];

  for (const compSet of components) {
    const nodes = [...compSet];
    const cycle = hasCycle(nodes);

    if (cycle) {
      const children = new Set(nodes.filter(n => childParent[n]));
      const roots = nodes.filter(n => !children.has(n));
      const root = roots.length > 0 ? roots.sort()[0] : nodes.sort()[0];

      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const children = new Set(nodes.filter(n => childParent[n] && compSet.has(childParent[n])));
      const roots = nodes.filter(n => !children.has(n));
      roots.sort();

      for (const root of roots) {
        const tree = buildTree(root);
        const depth = calcDepth(root);
        hierarchies.push({ root, tree, depth });
      }
    }
  }

  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root < b.root ? -1 : a.root > b.root ? 1 : 0;
  });

  const trees = hierarchies.filter(h => !h.has_cycle);
  const total_trees = trees.length;
  const total_cycles = hierarchies.filter(h => h.has_cycle).length;

  let largest_tree_root = '';
  if (trees.length > 0) {
    trees.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root < b.root ? -1 : 1;
    });
    largest_tree_root = trees[0].root;
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NO,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: { total_trees, total_cycles, largest_tree_root },
  };
}

module.exports = { processData };
