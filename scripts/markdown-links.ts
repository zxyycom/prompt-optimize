import GithubSlugger from "github-slugger";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";

export type MarkdownLinkTarget = {
  kind: "link" | "image" | "definition";
  target: string;
};

export type MarkdownLinkExtraction = {
  targets: MarkdownLinkTarget[];
  missingReferenceLabels: string[];
};

type MarkdownNode = {
  children?: MarkdownNode[];
  identifier?: unknown;
  label?: unknown;
  type?: unknown;
  url?: unknown;
};

const targetNodeTypes = new Set(["link", "image", "definition"]);
const referenceNodeTypes = new Set(["linkReference", "imageReference"]);

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/\s+/g, " ").toUpperCase();
}

function visitMarkdownNode(node: MarkdownNode, visit: (node: MarkdownNode) => void): void {
  visit(node);

  for (const child of node.children ?? []) {
    visitMarkdownNode(child, visit);
  }
}

export function extractMarkdownLinks(markdown: string): MarkdownLinkExtraction {
  const tree = fromMarkdown(markdown) as MarkdownNode;
  const targets: MarkdownLinkTarget[] = [];
  const definitionIdentifiers = new Set<string>();
  const references: Array<{ identifier: string; label: string }> = [];

  visitMarkdownNode(tree, (node) => {
    if (typeof node.type !== "string") {
      return;
    }

    if (targetNodeTypes.has(node.type) && typeof node.url === "string") {
      targets.push({ kind: node.type as MarkdownLinkTarget["kind"], target: node.url });

      if (node.type === "definition" && typeof node.identifier === "string") {
        definitionIdentifiers.add(normalizeIdentifier(node.identifier));
      }
      return;
    }

    if (referenceNodeTypes.has(node.type) && typeof node.identifier === "string") {
      references.push({
        identifier: normalizeIdentifier(node.identifier),
        label: typeof node.label === "string" ? node.label : node.identifier
      });
    }
  });

  const missingReferenceLabels = references
    .filter((reference) => !definitionIdentifiers.has(reference.identifier))
    .map((reference) => reference.label);

  return { targets, missingReferenceLabels };
}

export function extractMarkdownHeadingAnchors(markdown: string): Set<string> {
  const tree = fromMarkdown(markdown) as MarkdownNode;
  const slugger = new GithubSlugger();
  const anchors = new Set<string>();

  visitMarkdownNode(tree, (node) => {
    if (node.type !== "heading") {
      return;
    }

    anchors.add(slugger.slug(toString(node)));
  });

  return anchors;
}
