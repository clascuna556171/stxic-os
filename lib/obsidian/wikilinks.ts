/**
 * Obsidian `[[wikilinks]]` + `#tags` → markdown links for the note preview.
 *
 * A remark plugin that rewrites plain `text` nodes into `link` nodes carrying
 * a custom `stxic-note://` / `stxic-tag://` URL scheme. The preview component
 * intercepts those hrefs to render clickable chips/pills and resolve titles.
 * Runs inside react-markdown's pipeline, so code spans/fences are untouched
 * (their content is `code`/`inlineCode` nodes, not `text`).
 */

export const WIKILINK_SCHEME = "stxic-note";
export const TAG_SCHEME = "stxic-tag";

interface MdTextNode {
  type: "text";
  value: string;
}
interface MdLinkNode {
  type: "link";
  url: string;
  title: string | null;
  children: MdTextNode[];
}
interface MdParentNode {
  type: string;
  children: (MdTextNode | MdLinkNode | MdParentNode)[];
}
type MdNode = MdTextNode | MdLinkNode | MdParentNode;

const TOKEN_RE = /(\[\[[^\]|#]+?(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]|(?:^|[\s(])#[A-Za-z0-9_/-]+)/g;

function splitText(value: string): (MdTextNode | MdLinkNode)[] {
  const nodes: (MdTextNode | MdLinkNode)[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(value))) {
    if (match.index > last) {
      nodes.push({ type: "text", value: value.slice(last, match.index) });
    }
    const token = match[0]!;
    if (token.startsWith("[[")) {
      const inner = token.slice(2, -2);
      const aliasPart = inner.includes("|") ? inner.split("|")[1]!.trim() : null;
      const target = inner.split("|")[0]!.split("#")[0]!.trim();
      nodes.push({
        type: "link",
        url: `${WIKILINK_SCHEME}://${encodeURIComponent(target)}`,
        title: null,
        children: [{ type: "text", value: aliasPart || target }],
      });
    } else {
      const lead = /^[\s(]/.test(token) ? token[0]! : "";
      const tag = token.replace(/^[\s(]/, "").slice(1);
      if (lead) nodes.push({ type: "text", value: lead });
      nodes.push({
        type: "link",
        url: `${TAG_SCHEME}://${encodeURIComponent(tag)}`,
        title: null,
        children: [{ type: "text", value: `#${tag}` }],
      });
    }
    last = match.index + token.length;
  }
  if (last < value.length) nodes.push({ type: "text", value: value.slice(last) });
  return nodes;
}

function walk(nodes: MdNode[]) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if ("value" in node) {
      const replaced = splitText(node.value);
      if (replaced.length > 1 || replaced[0] !== node) {
        nodes.splice(i, 1, ...replaced);
        i += replaced.length - 1;
      }
    } else if ("children" in node) {
      walk(node.children);
    }
  }
}

/** Remark plugin: `remarkPlugins={[remarkObsidianLinks]}`. */
export function remarkObsidianLinks() {
  return (tree: unknown) => {
    const root = tree as { children: MdNode[] };
    if (root && Array.isArray(root.children)) walk(root.children);
  };
}
