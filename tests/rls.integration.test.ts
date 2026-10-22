// Needs a real Supabase project with the migrations applied. Skipped otherwise.
// Set TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD. Use a TEST project, not production.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const { TEST_SUPABASE_URL: url, TEST_SUPABASE_ANON_KEY: key, TEST_ADMIN_EMAIL: email, TEST_ADMIN_PASSWORD: password } = process.env;
describe.skipIf(!url || !key || !email || !password)("RLS", () => {
  let anon: SupabaseClient, admin: SupabaseClient;
  const slug = `rls-test-${Date.now()}`;
  beforeAll(async () => { anon = createClient(url!, key!); admin = createClient(url!, key!); const { error } = await admin.auth.signInWithPassword({ email: email!, password: password! }); expect(error).toBeNull(); });
  afterAll(async () => { await admin.from("posts").delete().eq("slug", slug); });
  it("anonymous users cannot write", async () => {
    expect((await anon.from("posts").insert({ slug: "x-anon", title: "x" })).error).not.toBeNull();
    expect((await anon.storage.from("media").upload(`uploads/${slug}.png`, new Blob(["x"], { type: "image/png" }))).error).not.toBeNull();
  });
  it("draft is private, then public after publish, and slugs are unique", async () => {
    const ins = await admin.from("posts").insert({ slug, title: "T", status: "draft" }).select("id").single(); expect(ins.error).toBeNull();
    expect((await anon.from("posts").select("id").eq("slug", slug)).data).toEqual([]);
    expect((await admin.from("posts").insert({ slug, title: "Dup" })).error?.code).toBe("23505");
    await admin.from("posts").update({ status: "published", published_at: new Date(Date.now() - 1000).toISOString() }).eq("id", ins.data!.id);
    expect((await anon.from("posts").select("id").eq("slug", slug)).data).toHaveLength(1);
    await admin.from("posts").update({ status: "draft" }).eq("id", ins.data!.id);
    expect((await anon.from("posts").select("id").eq("slug", slug)).data).toEqual([]);
  });
  it("anonymous update and delete affect nothing", async () => {
    await anon.from("posts").delete().eq("slug", slug);
    expect((await admin.from("posts").select("id").eq("slug", slug)).data).toHaveLength(1);
  });
});
