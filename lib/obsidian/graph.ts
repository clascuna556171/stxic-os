/**
 * Obsidian vault graph (pure) — build a note graph from vault notes and run a
 * small force-directed layout. No DOM / fetch; import-safe in tests.
 */

import { extractWikilinks } from "./format";

export interface GraphInputNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface Graph {
  nodes: GraphInputNote[];
  links: GraphLink[];
}

export interface PositionedNode extends GraphInputNote {
  x: number;
  y: number;
}

/** Build a graph: nodes = notes, edges = resolved `[[wikilinks]]`. */
export function buildGraph(notes: GraphInputNote[]): Graph {
  const byTitle = new Map<string, string>();
  for (const n of notes) {
    const key = n.title.trim().toLowerCase();
    if (key) byTitle.set(key, n.id);
  }

  const links: GraphLink[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    for (const target of extractWikilinks(n.content)) {
      const tid = byTitle.get(target.trim().toLowerCase());
      if (!tid || tid === n.id) continue;
      const key = tid < n.id ? `${tid}|${n.id}` : `${n.id}|${tid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: n.id, target: tid });
    }
  }
  return { nodes: notes, links };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LayoutOptions {
  width?: number;
  height?: number;
  iterations?: number;
  /** Group key for clustering — nodes sharing a group pack together. */
  groupKey?: (node: GraphInputNote) => string;
}

/** Force-directed layout (repulsion + springs + centering), centered at 0,0. */
export function layoutGraph(graph: Graph, opts: LayoutOptions = {}): PositionedNode[] {
  const width = opts.width ?? 600;
  const height = opts.height ?? 400;
  const iterations = opts.iterations ?? 160;
  const rand = mulberry32(42);

  const nodes: PositionedNode[] = graph.nodes.map((n) => ({
    ...n,
    x: (rand() - 0.5) * width * 0.8,
    y: (rand() - 0.5) * height * 0.8,
  }));
  if (nodes.length === 0) return nodes;

  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const links = graph.links.filter((l) => index.has(l.source) && index.has(l.target));
  const groupOf = opts.groupKey ?? ((n: GraphInputNote) => n.tags[0] ?? "");
  const groups = nodes.map((n) => groupOf(n));

  const REPULSION = 3200;
  const SPRING_LEN = 130;
  const SPRING_K = 0.04;
  const CENTER = 0.03;
  /** Different groups repel harder (so tag clusters separate); same group pack. */
  const GROUP_REPEL = 1.8;
  const SAME_GROUP_DAMP = 0.45;

  for (let it = 0; it < iterations; it++) {
    const fx = new Array<number>(nodes.length).fill(0);
    const fy = new Array<number>(nodes.length).fill(0);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i]!.x - nodes[j]!.x;
        const dy = nodes[i]!.y - nodes[j]!.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        let f = REPULSION / d2;
        if (groups[i] === groups[j]) f *= SAME_GROUP_DAMP;
        else f *= GROUP_REPEL;
        const d = Math.sqrt(d2);
        const px = (dx / d) * f;
        const py = (dy / d) * f;
        fx[i]! += px;
        fy[i]! += py;
        fx[j]! -= px;
        fy[j]! -= py;
      }
    }

    for (const l of links) {
      const si = index.get(l.source)!;
      const ti = index.get(l.target)!;
      const dx = nodes[ti]!.x - nodes[si]!.x;
      const dy = nodes[ti]!.y - nodes[si]!.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const f = (d - SPRING_LEN) * SPRING_K;
      const px = (dx / d) * f;
      const py = (dy / d) * f;
      fx[si]! += px;
      fy[si]! += py;
      fx[ti]! -= px;
      fy[ti]! -= py;
    }

    for (let i = 0; i < nodes.length; i++) {
      nodes[i]!.x += fx[i]! - nodes[i]!.x * CENTER;
      nodes[i]!.y += fy[i]! - nodes[i]!.y * CENTER;
    }
  }

  const halfW = width / 2 - 24;
  const halfH = height / 2 - 24;
  for (const n of nodes) {
    n.x = Math.max(-halfW, Math.min(halfW, n.x));
    n.y = Math.max(-halfH, Math.min(halfH, n.y));
  }
  return nodes;
}
