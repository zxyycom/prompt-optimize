import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

function extractMarkdownLinks(markdown: string): string[] {
  const links: string[] = [];
  const linkPattern = /!?\[[^\]\r\n]*\]\(([^)\r\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(markdown)) !== null) {
    links.push(match[1]);
  }

  return links;
}

function normalizeMarkdownTarget(rawTarget: string): { kind: "external" | "relative"; target: string } | null {
  let target = rawTarget.trim();
  if (target.length === 0 || target.startsWith("#")) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return { kind: "external", target };
  }

  target = target.replace(/^<|>$/g, "");
  const hashIndex = target.indexOf("#");
  if (hashIndex >= 0) {
    target = target.slice(0, hashIndex);
  }

  if (target.length === 0) {
    return null;
  }

  return { kind: "relative", target };
}

async function validateMarkdownLinks(markdownFiles: string[]): Promise<void> {
  for (const filePath of markdownFiles) {
    const markdown = await fs.readFile(filePath, "utf8");
    const links = extractMarkdownLinks(markdown);

    for (const rawLink of links) {
      const normalized = normalizeMarkdownTarget(rawLink);
      if (!normalized || normalized.kind === "external") {
        continue;
      }

      const resolved = path.resolve(path.dirname(filePath), normalized.target);
      const relativeToRoot = path.relative(rootDir, resolved);
      if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        report(`${toPosix(path.relative(rootDir, filePath))} links outside the repository: ${rawLink}`);
        continue;
      }

      if (!await exists(resolved)) {
        report(`${toPosix(path.relative(rootDir, filePath))} has a missing link target: ${rawLink}`);
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

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validation passed (${markdownFiles.length} markdown files checked).`);
