import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type DecisionValidationResult = {
  areaCount: number;
  decisionCount: number;
  errors: string[];
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredRootFiles = new Set(["README.md", "maintenance.md"]);
const requiredSections = ["## 问题", "## 背景与约束", "## 决策过程", "## 决定", "## 影响", "## 验证"];

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

function isValidDatePrefix(dateText: string): boolean {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSectionIndex(body: string, section: string): number {
  return body.search(new RegExp(`^${escapeRegExp(section)}\\s*$`, "m"));
}

function validateDecisionBody(relativePath: string, fileName: string, body: string, errors: string[]): void {
  const datePrefix = fileName.slice(0, 10);
  if (!isValidDatePrefix(datePrefix)) {
    errors.push(`${relativePath} has an invalid date prefix`);
  }

  if (!body.match(new RegExp(`^# ${datePrefix} - .+`, "m"))) {
    errors.push(`${relativePath} must start with "# ${datePrefix} - <标题>"`);
  }

  const sectionIndexes = requiredSections.map((section) => findSectionIndex(body, section));

  for (let index = 0; index < requiredSections.length; index += 1) {
    const section = requiredSections[index];
    const sectionIndex = sectionIndexes[index];
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

  for (let index = 0; index < requiredSections.length; index += 1) {
    const section = requiredSections[index];
    const sectionIndex = sectionIndexes[index];
    if (sectionIndex < 0) {
      continue;
    }

    const lineEnd = body.indexOf("\n", sectionIndex);
    const contentStart = lineEnd >= 0 ? lineEnd + 1 : body.length;
    const nextSectionIndexes = sectionIndexes.slice(index + 1).filter((value) => value >= 0);
    const contentEnd = nextSectionIndexes.length > 0 ? Math.min(...nextSectionIndexes) : body.length;
    const sectionContent = body.slice(contentStart, contentEnd).trim();
    if (sectionContent.length === 0) {
      errors.push(`${relativePath} section ${section} must not be empty`);
    }
  }
}

export async function validateDecisionRecords(workspaceRoot: string = rootDir): Promise<DecisionValidationResult> {
  const errors: string[] = [];
  const decisionsDir = path.join(workspaceRoot, "docs", "decisions");
  const indexPath = path.join(decisionsDir, "README.md");
  const maintenancePath = path.join(decisionsDir, "maintenance.md");
  let areaCount = 0;
  let decisionCount = 0;

  if (!await exists(decisionsDir)) {
    return { areaCount, decisionCount, errors: ["docs/decisions is required"] };
  }

  if (!await exists(indexPath)) {
    errors.push("docs/decisions/README.md is required");
  }

  if (!await exists(maintenancePath)) {
    errors.push("docs/decisions/maintenance.md is required");
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
      if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(areaEntry.name)) {
        errors.push(`Decision file name must be YYYY-MM-DD-short-title.md: ${relativeDecisionPath}`);
      }

      if (!index.includes(`](${relativeDecisionPath})`)) {
        errors.push(`Decision index must link to ${relativeDecisionPath}`);
      }

      const decisionPath = path.join(entryPath, areaEntry.name);
      const body = await fs.readFile(decisionPath, "utf8");
      validateDecisionBody(relativeDecisionPath, areaEntry.name, body, errors);
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
