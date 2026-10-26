/**
 * Smart Exam Scheduler - Spanning Tree Module (Kruskal & Prim)
 * 
 * Provides:
 * - DisjointSet: Union-Find with path compression and union by rank
 * - kruskal: Minimum / Maximum Spanning Forest on edge lists using stable integer sorting
 * - prim: O(K^2) Dense Matrix Spanning Tree algorithm
 * - preorderFromTree: Preorder walk generating slot permutations
 * 
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * Union-Find (Disjoint-Set) data structure with path compression and union by rank.
   */
  class DisjointSet {
    constructor(elements) {
      this.parent = new Map();
      this.rank = new Map();
      if (elements) {
        for (const el of elements) {
          this.parent.set(el, el);
          this.rank.set(el, 0);
        }
      }
    }

    makeSet(x) {
      if (!this.parent.has(x)) {
        this.parent.set(x, x);
        this.rank.set(x, 0);
      }
    }

    find(x) {
      if (!this.parent.has(x)) {
        this.makeSet(x);
      }
      let root = x;
      while (root !== this.parent.get(root)) {
        root = this.parent.get(root);
      }
      // Path compression
      let curr = x;
      while (curr !== root) {
        const next = this.parent.get(curr);
        this.parent.set(curr, root);
        curr = next;
      }
      return root;
    }

    union(x, y) {
      const rootX = this.find(x);
      const rootY = this.find(y);

      if (rootX === rootY) return false;

      const rankX = this.rank.get(rootX);
      const rankY = this.rank.get(rootY);

      if (rankX < rankY) {
        this.parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        this.parent.set(rootY, rootX);
      } else {
        this.parent.set(rootY, rootX);
        this.rank.set(rootX, rankX + 1);
      }

      return true;
    }
  }

  /**
   * Kruskal's Spanning Tree / Forest Algorithm.
   * Deterministic tie-breaking: sorts by weight, then u name, then v name.
   * 
   * @param {string[]} nodeNames Array of node identifiers
   * @param {Array<{u: string, v: string, weight: number}>} edges 
   * @param {Object} [options]
   * @param {boolean} [options.maximize=false] If true, computes Maximum Spanning Tree
   * @returns {{ edges: Array, totalWeight: number, components: number }}
   */
  function kruskal(nodeNames, edges, options) {
    const opts = Object.assign({ maximize: false }, options);
    const nodes = Array.from(new Set(nodeNames || []));
    let components = nodes.length;

    if (nodes.length === 0) {
      return { edges: [], totalWeight: 0, components: 0 };
    }

    const ds = new DisjointSet(nodes);

    // Normalize edge representation: ensure canonical u <= v for tie-breaking
    const edgeList = (edges || []).map(e => {
      const [u, v] = e.u.localeCompare(e.v) <= 0 ? [e.u, e.v] : [e.v, e.u];
      return { u, v, weight: e.weight };
    });

    // Initial comparison sort on u then v for deterministic tie-breaking
    edgeList.sort((a, b) => {
      const uCmp = a.u.localeCompare(b.u);
      if (uCmp !== 0) return uCmp;
      return a.v.localeCompare(b.v);
    });

    // Stable sort by weight using CountingSortBy (or its fallback)
    let sortedEdges = edgeList;
    if (global.SortingModule && global.SortingModule.countingSortBy) {
      sortedEdges = global.SortingModule.countingSortBy(
        edgeList,
        e => Math.round(e.weight),
        { descending: opts.maximize }
      ).sorted;
    } else {
      sortedEdges = [...edgeList].sort((a, b) => {
        return opts.maximize ? b.weight - a.weight : a.weight - b.weight;
      });
    }

    const chosenEdges = [];
    let totalWeight = 0;

    for (let i = 0; i < sortedEdges.length; i++) {
      const edge = sortedEdges[i];
      if (ds.union(edge.u, edge.v)) {
        chosenEdges.push(edge);
        totalWeight += edge.weight;
        components--;
        if (chosenEdges.length === nodes.length - 1) {
          break;
        }
      }
    }

    return {
      edges: chosenEdges,
      totalWeight,
      components
    };
  }

  /**
   * Prim's Algorithm for dense symmetric K x K weight matrix.
   * O(K^2) array-based implementation.
   * 
   * @param {number[][]} matrix Symmetric K x K matrix of weights
   * @param {number} [start=0] Starting vertex index
   * @returns {{ edges: Array<{a: number, b: number, weight: number}>, totalWeight: number }}
   */
  function prim(matrix, start = 0) {
    if (!matrix || matrix.length === 0) {
      return { edges: [], totalWeight: 0 };
    }

    const K = matrix.length;
    if (K === 1) {
      return { edges: [], totalWeight: 0 };
    }

    const inTree = new Array(K).fill(false);
    const minEdge = new Array(K).fill(Infinity);
    const parent = new Array(K).fill(-1);

    const safeStart = (start >= 0 && start < K) ? start : 0;
    minEdge[safeStart] = 0;

    const edges = [];
    let totalWeight = 0;

    for (let step = 0; step < K; step++) {
      // Find vertex u not in tree with minimum edge weight
      let u = -1;
      let minVal = Infinity;

      for (let i = 0; i < K; i++) {
        if (!inTree[i] && minEdge[i] < minVal) {
          minVal = minEdge[i];
          u = i;
        }
      }

      // Disconnected component handling
      if (u === -1) {
        for (let i = 0; i < K; i++) {
          if (!inTree[i]) {
            u = i;
            break;
          }
        }
      }

      inTree[u] = true;

      if (parent[u] !== -1) {
        const p = parent[u];
        const w = matrix[p][u];
        edges.push({ a: p, b: u, weight: w });
        totalWeight += w;
      }

      // Update distance to neighbors
      for (let v = 0; v < K; v++) {
        if (!inTree[v]) {
          const w = matrix[u][v];
          if (w < minEdge[v]) {
            minEdge[v] = w;
            parent[v] = u;
          }
        }
      }
    }

    return { edges, totalWeight };
  }

  /**
   * DFS preorder traversal of a spanning tree/forest on K vertices.
   * Visits neighbors in ascending index order to return a deterministic permutation of 0..K-1.
   * 
   * @param {number} K Total number of vertices
   * @param {Array<{a: number, b: number}>} treeEdges 
   * @param {number} [root=0] 
   * @returns {number[]} Permutation of 0..K-1
   */
  function preorderFromTree(K, treeEdges, root = 0) {
    if (K <= 0) return [];
    if (K === 1) return [0];

    // Build adjacency list
    const adj = Array.from({ length: K }, () => []);
    for (const e of treeEdges) {
      if (e.a >= 0 && e.a < K && e.b >= 0 && e.b < K) {
        adj[e.a].push(e.b);
        adj[e.b].push(e.a);
      }
    }

    // Sort neighbors in ascending order for determinism
    for (let i = 0; i < K; i++) {
      adj[i].sort((x, y) => x - y);
    }

    const visited = new Array(K).fill(false);
    const order = [];

    function dfs(u) {
      visited[u] = true;
      order.push(u);
      for (const v of adj[u]) {
        if (!visited[v]) {
          dfs(v);
        }
      }
    }

    const safeRoot = (root >= 0 && root < K) ? root : 0;
    dfs(safeRoot);

    // Handle disconnected components in ascending order
    for (let i = 0; i < K; i++) {
      if (!visited[i]) {
        dfs(i);
      }
    }

    return order;
  }

  const MSTModule = {
    DisjointSet,
    kruskal,
    prim,
    preorderFromTree
  };

  global.MSTModule = MSTModule;

})(typeof window !== 'undefined' ? window : globalThis);
