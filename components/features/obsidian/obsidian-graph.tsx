"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { type ObsidianClient } from "@/lib/obsidian/client";
import { parseFrontmatter } from "@/lib/obsidian/format";
import {
  buildGraph,
  layoutGraph,
  type GraphLink,
  type GraphInputNote,
  type PositionedNode,
} from "@/lib/obsidian/graph";
import { useObsidianBridge } from "./use-obsidian-bridge";
import { cn } from "@/lib/utils/cn";

const MAX_NOTES = 200;
const W = 640;
const H = 400;

/** Muted per-tag palette (Obsidian-like), keeps saturation < 80%. */
const PALETTE = [
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#f472b6",
  "#60a5fa",
  "#f87171",
  "#22d3ee",
  "#c084fc",
  "#facc15",
  "#2dd4bf",
];

function colorFor(tags: string[]): string {
  const primary = tags.find((t) => t.length > 0);
  if (!primary) return "#8b8b93";
  let h = 0;
  for (const c of primary) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

async function collectPaths(client: ObsidianClient, path: string, acc: string[]): Promise<void> {
  if (acc.length >= MAX_NOTES * 2) return;
  const res = await client.listDirectory(path);
  if (!res.ok) return;
  for (const entry of res.data) {
    if (acc.length >= MAX_NOTES * 2) break;
    const isDir = entry.filename.endsWith("/");
    const name = isDir ? entry.filename.slice(0, -1) : entry.filename;
    const full = path ? `${path}/${name}` : name;
    if (isDir) {
      await collectPaths(client, full, acc);
    } else if (name.toLowerCase().endsWith(".md")) {
      acc.push(full);
    }
  }
}

async function collectVaultNotes(client: ObsidianClient): Promise<GraphInputNote[]> {
  const paths: string[] = [];
  await collectPaths(client, "", paths);
  const notes: GraphInputNote[] = [];
  let i = 0;
  while (i < paths.length && notes.length < MAX_NOTES) {
    const batch = paths.slice(i, i + 6);
    i += 6;
    const results = await Promise.all(
      batch.map(async (p) => {
        const note = await client.readNote(p);
        if (!note.ok) return null;
        const { frontmatter, content } = parseFrontmatter(note.data.content);
        return {
          id: p,
          title: frontmatter.title ?? p.split("/").pop()!.replace(/\.md$/i, ""),
          content,
          tags: frontmatter.tags ?? [],
        };
      }),
    );
    for (const r of results) if (r) notes.push(r);
  }
  return notes;
}

/** Obsidian-style graph of the live vault (dashboard widget). */
export function ObsidianGraphWidget() {
  const bridge = useObsidianBridge();
  const router = useRouter();
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const panRef = useRef<{
    startX: number;
    startY: number;
    tx: number;
    ty: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const client = bridge.client;
    if (!client) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const raw = await collectVaultNotes(client);
        if (cancelled) return;
        const graph = buildGraph(raw);
        setNodes(layoutGraph(graph, { groupKey: (n) => n.tags[0] ?? "" }));
        setLinks(graph.links);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bridge.client]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of links) {
      if (!map.has(l.source)) map.set(l.source, new Set());
      if (!map.has(l.target)) map.set(l.target, new Set());
      map.get(l.source)!.add(l.target);
      map.get(l.target)!.add(l.source);
    }
    return map;
  }, [links]);

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const scale = Math.max(0.3, Math.min(3, view.scale * factor));
    setView((v) => ({ ...v, scale }));
  }

  function onPanDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tx: view.tx,
      ty: view.ty,
      moved: false,
    };
  }
  function onPanMove(e: React.PointerEvent<SVGSVGElement>) {
    const p = panRef.current;
    if (!p) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) p.moved = true;
    if (p.moved) setView({ ...view, tx: p.tx + dx, ty: p.ty + dy });
  }
  function onPanUp() {
    panRef.current = null;
  }

  if (!bridge.config) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!bridge.config.enabled) {
    return (
      <EmptyState
        title="Obsidian is not enabled"
        description="Enable it in Settings to see your vault as a graph."
        action={
          <Button variant="primary" size="sm" onClick={() => router.push("/settings")}>
            Open Settings
          </Button>
        }
      />
    );
  }

  if (loading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Waypoints />}
        title="Couldn't load the vault"
        description={bridge.connected ? error : "Obsidian must be running on this machine."}
        action={
          <Button variant="secondary" size="sm" onClick={bridge.refresh}>
            Retry
          </Button>
        }
      />
    );
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<Waypoints />}
        title="No notes in the vault"
        description="Push a note from the Notes page to populate the graph."
      />
    );
  }

  const hovered = hover ? (neighbors.get(hover) ?? new Set<string>()) : new Set<string>();
  const hoverNode = hover ? nodeById.get(hover) : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1.6px)",
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(circle at 50% 45%, black 35%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 35%, transparent 95%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 50% 45%, transparent 40%, color-mix(in srgb, var(--bg) 60%, transparent))",
        }}
      />

      <svg
        viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}
        className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing"
        style={{ color: "var(--text)", touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPanDown}
        onPointerMove={onPanMove}
        onPointerUp={onPanUp}
        onPointerCancel={onPanUp}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {links.map((l) => {
            const a = nodeById.get(l.source);
            const b = nodeById.get(l.target);
            if (!a || !b) return null;
            const active = hover === a.id || hover === b.id;
            const dim = hover !== null && !active;
            return (
              <g
                key={`${l.source}|${l.target}`}
                className={cn("transition-opacity", dim && "opacity-5")}
              >
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeWidth={active ? 4 : 2.5}
                  opacity={active ? 0.12 : 0.05}
                  className="transition-opacity"
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeWidth={active ? 0.9 : 0.5}
                  opacity={active ? 0.55 : 0.22}
                  className="transition-opacity"
                />
              </g>
            );
          })}

          {nodes.map((n) => {
            const color = colorFor(n.tags);
            const active = hover === n.id || hovered.has(n.id);
            const dim = hover !== null && !active;
            const r = Math.min(2.5 + (neighbors.get(n.id)?.size ?? 0) * 0.9, 7);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => router.push(`/notes?open=${encodeURIComponent(n.id)}`)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                className={cn("cursor-pointer", dim && "opacity-15")}
              >
                <circle r={r * 2.6} fill={color} opacity={0.14} />
                <circle r={r} fill={color} />
              </g>
            );
          })}

          {hoverNode ? (
            <g transform={`translate(${hoverNode.x}, ${hoverNode.y - 14})`} pointerEvents="none">
              <rect
                x={-(hoverNode.title.length * 6.2 + 14) / 2}
                y={-11}
                width={hoverNode.title.length * 6.2 + 14}
                height={20}
                rx={6}
                fill="var(--surface-2)"
                stroke="var(--border)"
              />
              <text textAnchor="middle" y={4} fontSize={10} fill="var(--text)">
                {hoverNode.title}
              </text>
            </g>
          ) : null}
        </g>
      </svg>

      <Link
        href="/notes"
        className="text-muted hover:text-foreground absolute right-2 bottom-2 z-10 text-xs transition-colors"
      >
        Open notes →
      </Link>
    </div>
  );
}
