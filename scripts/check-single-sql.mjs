import { readdir, lstat } from "node:fs/promises";
import { relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const canonicalSchema = "supabase-unified.sql";
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);

async function collectSqlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        matches.push(...(await collectSqlFiles(resolve(directory, entry.name))));
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".sql")) continue;
    const path = resolve(directory, entry.name);
    if ((await lstat(path)).isFile()) matches.push(path);
  }

  return matches;
}

const sqlFiles = (await collectSqlFiles(projectRoot))
  .map(path => relative(projectRoot, path))
  .sort();
const allowed = [canonicalSchema];
const invalid = sqlFiles.filter(path => !allowed.includes(path));
const missingCanonical = !sqlFiles.includes(canonicalSchema);

if (missingCanonical || invalid.length > 0 || sqlFiles.length !== allowed.length) {
  console.error("Schema SQL repository phải chỉ chứa supabase-unified.sql.");
  console.error(`Tìm thấy: ${sqlFiles.length ? sqlFiles.join(", ") : "(không có file .sql)"}`);
  process.exit(1);
}

console.log("SQL layout hợp lệ: chỉ có supabase-unified.sql.");
