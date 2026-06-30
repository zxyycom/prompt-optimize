import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractMarkdownLinks } from "./markdown-links.ts";

export type DecisionValidationResult = {
  areaCount: number;
  decisionCount: number;
  errors: string[];
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredRootFiles = new Set(["decision-record-index.md", "decision-record-rules.md"]);
const decisionStatuses = new Set(["active", "amended", "superseded", "invalidated"]);
const sectionOrder = ["## 状态", "## 问题", "## 背景与约束", "## 决策过程", "## 决定", "## 影响", "## 验证"];
const requiredSections = ["## 状态", "## 问题", "## 决定", "## 影响", "## 验证"];
const decisionFilePathPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/\d{6}-[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function fullDateFromCompactPrefix(dateText: string): string | null {
  const match = dateText.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) {
    return null;
  }

  return `${year}-${match[2]}-${match[3]}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSectionIndex(body: string, section: string): number {
  return body.search(new RegExp(`^${escapeRegExp(section)}\\s*$`, "m"));
}

function parseDecisionFileName(fileName: string): { datePrefix: string; status: string } | null {
  const match = fileName.match(/^(\d{6})-([a-z]+)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
  if (!match) {
    return null;
  }

  return { datePrefix: match[1], status: match[2] };
}

function getSectionContent(body: string, sectionIndexes: number[], index: number): string {
  const sectionIndex = sectionIndexes[index];
  if (sectionIndex < 0) {
    return "";
  }

  const lineEnd = body.indexOf("\n", sectionIndex);
  const contentStart = lineEnd >= 0 ? lineEnd + 1 : body.length;
  const nextSectionIndexes = sectionIndexes.slice(index + 1).filter((value) => value >= 0);
  const contentEnd = nextSectionIndexes.length > 0 ? Math.min(...nextSectionIndexes) : body.length;

  return body.slice(contentStart, contentEnd).trim();
}

async function validateStatusCauseLinks(
  relativePath: string,
  decisionDirectory: string,
  decisionsDir: string,
  rawLinks: string[],
  errors: string[]
): Promise<void> {
  for (const rawLink of rawLinks) {
    let target = rawLink.trim().replace(/^<|>$/g, "");

    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      errors.push(`${relativePath} non-active status cause must link to a repository decision file: ${rawLink}`);
      continue;
    }

    const hashIndex = target.indexOf("#");
    if (hashIndex >= 0) {
      target = target.slice(0, hashIndex);
    }

    if (target.length === 0) {
      errors.push(`${relativePath} non-active status cause must link to a decision file, not only an anchor: ${rawLink}`);
      continue;
    }

    const resolvedTarget = path.resolve(decisionDirectory, target);
    const relativeToDecisions = path.relative(decisionsDir, resolvedTarget);
    const normalizedRelativeTarget = toPosix(relativeToDecisions);

    if (relativeToDecisions.startsWith("..") || path.isAbsolute(relativeToDecisions)) {
      errors.push(`${relativePath} non-active status cause links outside docs/decisions: ${rawLink}`);
      continue;
    }

    if (!decisionFilePathPattern.test(normalizedRelativeTarget)) {
      errors.push(`${relativePath} non-active status cause must target a decision file under an impact area: ${rawLink}`);
      continue;
    }

    if (!await exists(resolvedTarget)) {
      errors.push(`${relativePath} non-active status cause target does not exist: ${rawLink}`);
    }
  }
}

async function validateDecisionBody(
  relativePath: string,
  fileName: string,
  body: string,
  decisionPath: string,
  decisionsDir: string,
  errors: string[]
): Promise<void> {
  const parsedFileName = parseDecisionFileName(fileName);
  const datePrefix = parsedFileName?.datePrefix ?? fileName.slice(0, 6);
  const fullDatePrefix = fullDateFromCompactPrefix(datePrefix);
  const status = parsedFileName?.status;

  if (!parsedFileName) {
    errors.push(`${relativePath} must use file name format YYMMDD-<status>-short-title.md`);
  }

  if (!fullDatePrefix) {
    errors.push(`${relativePath} has an invalid date prefix`);
  }

  if (status && !decisionStatuses.has(status)) {
    errors.push(`${relativePath} has unsupported status ${status}`);
  }

  if (!fullDatePrefix || !body.match(new RegExp(`^# ${fullDatePrefix} - .+`, "m"))) {
    errors.push(`${relativePath} must start with "# ${fullDatePrefix ?? "YYYY-MM-DD"} - <标题>"`);
  }

  const sectionIndexes = sectionOrder.map((section) => findSectionIndex(body, section));

  for (const section of requiredSections) {
    const sectionIndex = findSectionIndex(body, section);
    if (sectionIndex < 0) {
      errors.push(`${relativePath} is missing section ${section}`);
    }
  }

  let lastIndex = -1;
  for (const sectionIndex of sectionIndexes) {
    if (sectionIndex < 0) {
      continue;
    }

    if (sectionIndex < lastIndex) {
      errors.push(`${relativePath} has sections out of order`);
      break;
    }
    lastIndex = sectionIndex;
  }

  for (let index = 0; index < sectionOrder.length; index += 1) {
    const section = sectionOrder[index];
    const sectionContent = getSectionContent(body, sectionIndexes, index);
    if (sectionIndexes[index] < 0) {
      continue;
    }

    if (sectionContent.length === 0) {
      errors.push(`${relativePath} section ${section} must not be empty`);
    }
  }

  if (!status || !decisionStatuses.has(status)) {
    return;
  }

  const statusContent = getSectionContent(body, sectionIndexes, 0);
  if (!statusContent.match(new RegExp(`^- 当前状态: ${escapeRegExp(status)}\\s*$`, "m"))) {
    errors.push(`${relativePath} status section must include "- 当前状态: ${status}"`);
  }

  const causeMatch = statusContent.match(/^- 导致状态变化的决策: (.+)$/m);
  if (!causeMatch) {
    errors.push(`${relativePath} status section must include "- 导致状态变化的决策: <value>"`);
    return;
  }

  const cause = causeMatch[1].trim();
  if (status === "active") {
    if (cause !== "无") {
      errors.push(`${relativePath} active decisions must use "无" as status cause`);
    }
    return;
  }

  if (cause === "无") {
    errors.push(`${relativePath} non-active decisions must link to the later decision that changed their status`);
    return;
  }

  const { targets: statusCauseLinks, missingReferenceLabels } = extractMarkdownLinks(cause);
  for (const label of missingReferenceLabels) {
    errors.push(`${relativePath} non-active status cause has an undefined markdown reference link: ${label}`);
  }

  if (statusCauseLinks.length === 0) {
    errors.push(`${relativePath} non-active status cause must be a markdown link to a decision file`);
    return;
  }

  await validateStatusCauseLinks(
    relativePath,
    path.dirname(decisionPath),
    decisionsDir,
    statusCauseLinks.map((link) => link.target),
    errors
  );
}

export async function validateDecisionRecords(workspaceRoot: string = rootDir): Promise<DecisionValidationResult> {
  const errors: string[] = [];
  const decisionsDir = path.join(workspaceRoot, "docs", "decisions");
  const indexPath = path.join(decisionsDir, "decision-record-index.md");
  const rulesPath = path.join(decisionsDir, "decision-record-rules.md");
  let areaCount = 0;
  let decisionCount = 0;

  if (!await exists(decisionsDir)) {
    return { areaCount, decisionCount, errors: ["docs/decisions is required"] };
  }

  if (!await exists(indexPath)) {
    errors.push("docs/decisions/decision-record-index.md is required");
  }

  if (!await exists(rulesPath)) {
    errors.push("docs/decisions/decision-record-rules.md is required");
  }

  const index = await exists(indexPath) ? await fs.readFile(indexPath, "utf8") : "";
  const rootEntries = await fs.readdir(decisionsDir, { withFileTypes: true });

  for (const entry of rootEntries) {
    const entryPath = path.join(decisionsDir, entry.name);

    if (entry.isFile()) {
      if (!requiredRootFiles.has(entry.name)) {
        errors.push(`docs/decisions root must not contain decision files or extra files: ${entry.name}`);
      }
      continue;
    }

    if (!entry.isDirectory()) {
      errors.push(`docs/decisions contains unsupported entry: ${entry.name}`);
      continue;
    }

    const areaId = entry.name;
    areaCount += 1;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(areaId)) {
      errors.push(`Decision impact area must use kebab-case: ${areaId}`);
    }

    if (!index.includes(`\`${areaId}\``)) {
      errors.push(`Decision index must describe impact area ${areaId}`);
    }

    const areaEntries = await fs.readdir(entryPath, { withFileTypes: true });
    const decisionFiles = areaEntries.filter((file) => file.isFile() && file.name.endsWith(".md"));

    if (decisionFiles.length === 0) {
      errors.push(`Decision impact area must contain at least one decision file: ${areaId}`);
    }

    for (const areaEntry of areaEntries) {
      if (areaEntry.isDirectory()) {
        errors.push(`Decision impact area must not contain nested directories: ${areaId}/${areaEntry.name}`);
        continue;
      }

      if (!areaEntry.isFile()) {
        errors.push(`Decision impact area contains unsupported entry: ${areaId}/${areaEntry.name}`);
        continue;
      }

      if (!areaEntry.name.endsWith(".md")) {
        errors.push(`Decision impact area must contain only markdown files: ${areaId}/${areaEntry.name}`);
        continue;
      }

      const relativeDecisionPath = toPosix(path.join(areaId, areaEntry.name));
      if (!index.includes(`](${relativeDecisionPath})`)) {
        errors.push(`Decision index must link to ${relativeDecisionPath}`);
      }

      const decisionPath = path.join(entryPath, areaEntry.name);
      const body = await fs.readFile(decisionPath, "utf8");
      await validateDecisionBody(relativeDecisionPath, areaEntry.name, body, decisionPath, decisionsDir, errors);
      decisionCount += 1;
    }
  }

  return { areaCount, decisionCount, errors };
}

if (import.meta.main) {
  const result = await validateDecisionRecords();

  if (result.errors.length > 0) {
    console.error("Decision structure validation failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Decision structure validation passed (${result.areaCount} areas, ${result.decisionCount} decisions).`);
}
