import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("deferred work backlog", () => {
  it("keeps the canonical table, lifecycle constraints and indexes", () => {
    const sql = readProjectFile("supabase-unified.sql");
    expect(sql).toContain("create table if not exists public.deferred_work_items");
    expect(sql).toContain("status in ('backlog', 'in_progress', 'blocked', 'completed', 'archived')");
    expect(sql).toContain("check ((status = 'completed') = (completed_at is not null))");
    expect(sql).toContain("deferred_work_items_status_priority_idx");
  });

  it("gates backlog access behind the deferredWork capability", () => {
    const sql = readProjectFile("supabase-unified.sql");
    expect(sql).toContain("create or replace function public.can_manage_deferred_work()");
    expect(sql).toContain("public.has_role_capability('deferredWork')");
    expect(sql).toContain('"Deferred work managers can read backlog"');
    expect(sql).toContain('"Deferred work managers can update backlog"');
    expect(sql).toContain("update public.role_definitions set capabilities = capabilities || '{\"deferredWork\":true}'::jsonb where role_key in");
  });

  it("keeps Admin navigation, modal and data operations wired", () => {
    const html = readProjectFile("client/admin.html");
    const js = readProjectFile("client/admin.js");
    expect(html).toContain('data-view="deferred-work"');
    expect(html).toContain('id="deferredWorkForm"');
    expect(html).toContain('id="deferredWorkNavCount"');
    expect(js).toContain('db.from("deferred_work_items")');
    expect(js).toContain("function renderDeferredWork()");
    expect(js).toContain("async function saveDeferredWork");
    expect(js).toContain('hide("deferred-work", !canDeferredWork)');
  });
});
