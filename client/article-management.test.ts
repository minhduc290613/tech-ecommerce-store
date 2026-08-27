import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), "client", name), "utf8");

describe("article deletion and cover images", () => {
  it("xóa bài viết qua RPC của tác giả và lưu audit không kèm nội dung", () => {
    const schema = readFileSync(resolve(process.cwd(), "supabase-unified.sql"), "utf8");
    expect(schema).toContain("create or replace function public.delete_my_article");
    expect(schema).toContain("where id = p_id and author_id = auth.uid()");
    expect(schema).toContain("'article_deleted'");
    expect(schema).toContain("grant execute on function public.delete_my_article(uuid) to authenticated");
  });

  it("hỗ trợ tải ảnh bìa và có fallback khi ảnh URL lỗi", () => {
    const account = read("account-center.js");
    const reader = read("article.js");
    const journal = read("community-features.js");
    expect(account).toContain('id="articleCoverUpload"');
    expect(account).toContain('const path = `articles/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`');
    expect(account).toContain('data-delete-article');
    expect(reader).toContain('querySelector(".article-cover")?.addEventListener("error"');
    expect(journal).toContain('querySelectorAll(".journal-card img")');
  });
});
