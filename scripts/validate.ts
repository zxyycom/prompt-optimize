import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractMarkdownHeadingAnchors, extractMarkdownLinks } from "./markdown-links.ts";
import { validateDecisionRecords } from "./validate-decisions.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillName = "prompt-optimize";
const errors: string[] = [];

const ignoredDirectories = new Set([".git", "node_modules", "dist"]);
const bannedProjectPatterns = [
  { label: "external URL", pattern: /https?:\/\//i },
  { label: "absolute Windows path", pattern: /\b[A-Z]:\\/ },
  { label: "workspace-local skill path", pattern: /\.codex/i },
  { label: "out-of-scope source name", pattern: /openspec/i }
];

function report(message: string): void {
  errors.push(message);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function parseFrontmatter(markdown: string): { keys: string[]; values: Map<string, string> } | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return null;
  }

  const body = match[1];
  const keys: string[] = [];
  const values = new Map<string, string>();

  for (const line of body.split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    keys.push(keyMatch[1]);
    values.set(keyMatch[1], keyMatch[2].trim().replace(/^["']|["']$/g, ""));
  }

  return { keys, values };
}

async function validateSkillFrontmatter(): Promise<void> {
  const skillDir = path.join(rootDir, "skill", skillName);
  const skillMdPath = path.join(skillDir, "SKILL.md");

  if (!await exists(skillMdPath)) {
    report("Missing skill/prompt-optimize/SKILL.md");
    return;
  }

  const markdown = await fs.readFile(skillMdPath, "utf8");
  const frontmatter = parseFrontmatter(markdown);
  if (!frontmatter) {
    report("SKILL.md must start with YAML frontmatter");
    return;
  }

  const allowedKeys = new Set(["name", "description"]);
  const unknownKeys = frontmatter.keys.filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    report(`SKILL.md frontmatter has unsupported keys: ${unknownKeys.join(", ")}`);
  }

  for (const key of allowedKeys) {
    if (!frontmatter.keys.includes(key)) {
      report(`SKILL.md frontmatter is missing ${key}`);
    }
  }

  const name = frontmatter.values.get("name");
  if (name !== skillName) {
    report(`SKILL.md name must be ${skillName}`);
  }

  if (!/^[a-z0-9-]+$/.test(name ?? "")) {
    report("SKILL.md name must use lowercase letters, digits, and hyphens");
  }

  const descriptionLine = frontmatter.values.get("description");
  if (descriptionLine === undefined || descriptionLine.length === 0) {
    const hasBlockDescription = /description:\s*[>|]-?\r?\n(?:[ \t]+.+\r?\n?)+/.test(markdown);
    if (!hasBlockDescription) {
      report("SKILL.md description must not be empty");
    }
  }
}

type NormalizedMarkdownTarget =
  | { kind: "empty"; target: string }
  | { kind: "external"; target: string }
  | { anchor: string | null; kind: "internal"; pathTarget: string | null; target: string };

function normalizeMarkdownTarget(rawTarget: string): NormalizedMarkdownTarget {
  const target = rawTarget.trim().replace(/^<|>$/g, "");
  if (target.length === 0) {
    return { kind: "empty", target };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return { kind: "external", target };
  }

  const hashIndex = target.indexOf("#");
  const pathTarget = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const anchor = hashIndex >= 0 ? target.slice(hashIndex + 1) : null;

  return { anchor, kind: "internal", pathTarget: pathTarget.length > 0 ? pathTarget : null, target };
}

function decodeMarkdownAnchor(anchor: string): string | null {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return null;
  }
}

async function validateMarkdownLinks(markdownFiles: string[]): Promise<void> {
  const headingAnchorsByPath = new Map<string, Set<string>>();

  async function getHeadingAnchors(filePath: string): Promise<Set<string>> {
    const cached = headingAnchorsByPath.get(filePath);
    if (cached) {
      return cached;
    }

    const markdown = await fs.readFile(filePath, "utf8");
    const anchors = extractMarkdownHeadingAnchors(markdown);
    headingAnchorsByPath.set(filePath, anchors);
    return anchors;
  }

  for (const filePath of markdownFiles) {
    const markdown = await fs.readFile(filePath, "utf8");
    const { targets, missingReferenceLabels } = extractMarkdownLinks(markdown);
    const relativeFilePath = toPosix(path.relative(rootDir, filePath));

    for (const label of missingReferenceLabels) {
      report(`${relativeFilePath} has an undefined markdown reference link: ${label}`);
    }

    for (const { target } of targets) {
      const normalized = normalizeMarkdownTarget(target);
      if (normalized.kind === "empty") {
        report(`${relativeFilePath} has an empty markdown link target`);
        continue;
      }

      if (normalized.kind === "external") {
        report(`${relativeFilePath} links outside the repository: ${target}`);
        continue;
      }

      const resolved = normalized.pathTarget
        ? path.resolve(path.dirname(filePath), normalized.pathTarget)
        : filePath;
      const relativeToRoot = path.relative(rootDir, resolved);
      if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        report(`${relativeFilePath} links outside the repository: ${target}`);
        continue;
      }

      if (!await exists(resolved)) {
        report(`${relativeFilePath} has a missing link target: ${target}`);
        continue;
      }

      if (normalized.anchor === null) {
        continue;
      }

      const decodedAnchor = decodeMarkdownAnchor(normalized.anchor);
      if (decodedAnchor === null || decodedAnchor.length === 0) {
        report(`${relativeFilePath} has an invalid markdown anchor: ${target}`);
        continue;
      }

      if (path.extname(resolved) !== ".md") {
        report(`${relativeFilePath} uses an anchor on a non-markdown target: ${target}`);
        continue;
      }

      const anchors = await getHeadingAnchors(resolved);
      if (!anchors.has(decodedAnchor)) {
        report(`${relativeFilePath} links to a missing markdown heading anchor: ${target}`);
      }
    }
  }
}

async function validateBannedProjectText(markdownFiles: string[]): Promise<void> {
  for (const filePath of markdownFiles) {
    const markdown = await fs.readFile(filePath, "utf8");
    const relativePath = toPosix(path.relative(rootDir, filePath));

    for (const { label, pattern } of bannedProjectPatterns) {
      if (pattern.test(markdown)) {
        report(`${relativePath} contains ${label}`);
      }
    }
  }
}

async function validatePackageScripts(): Promise<void> {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!await exists(packageJsonPath)) {
    report("package.json is required for local validation and packaging scripts");
    return;
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  for (const scriptName of ["validate", "validate:decisions", "pack:skill", "check", "deploy:package"]) {
    if (!packageJson.scripts?.[scriptName]) {
      report(`package.json is missing script ${scriptName}`);
    }
  }
}

async function validateCiWorkflow(): Promise<void> {
  const workflowPath = path.join(rootDir, ".github", "workflows", "package-skill.yml");
  if (!await exists(workflowPath)) {
    report(".github/workflows/package-skill.yml is required for CI packaging and release publishing");
    return;
  }

  const workflow = await fs.readFile(workflowPath, "utf8");
  const requiredPatterns = [
    { label: "package job", pattern: /^\s*package:\s*$/m },
    { label: "publish job", pattern: /^\s*publish:\s*$/m },
    { label: "artifact upload", pattern: /actions\/upload-artifact@v4/ },
    { label: "artifact download", pattern: /actions\/download-artifact@v4/ },
    { label: "main branch publish guard", pattern: /github\.ref == 'refs\/heads\/main'/ },
    { label: "release write permission", pattern: /contents:\s*write/ },
    { label: "latest release tag", pattern: /RELEASE_TAG:\s*prompt-optimize-latest/ },
    { label: "release creation", pattern: /gh release create/ },
    { label: "release asset upload", pattern: /gh release upload/ }
  ];

  for (const { label, pattern } of requiredPatterns) {
    if (!pattern.test(workflow)) {
      report(`CI workflow is missing ${label}`);
    }
  }
}

const allFiles = await collectFiles(rootDir);
const markdownFiles = allFiles.filter((filePath) => filePath.endsWith(".md"));

await validateSkillFrontmatter();
await validateMarkdownLinks(markdownFiles);
await validateBannedProjectText(markdownFiles);
const decisionValidation = await validateDecisionRecords(rootDir);
for (const error of decisionValidation.errors) {
  report(error);
}
await validatePackageScripts();
await validateCiWorkflow();

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validation passed (${markdownFiles.length} markdown files checked).`);
