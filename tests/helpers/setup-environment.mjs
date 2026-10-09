import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const state = { db: null, admin: true, queries: [], cloudCalls: [], cloudResult: null };
globalThis.__setupTest = state;
const root = new URL("../../", import.meta.url);
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const mocks = {
  "@/lib/db": moduleUrl(`
    const query = async (text, values = []) => {
      const state = globalThis.__setupTest;
      state.queries.push({text, values});
      return (await state.db.query(text, values)).rows;
    };
    export const sql = (strings, ...values) => query(strings.reduce((text, part, i) => text + (i ? "$" + i : "") + part, ""), values);
    sql.query = query;
  `),
  "@/lib/admin-auth": moduleUrl("export const isAdmin = async () => globalThis.__setupTest.admin;"),
  "@/lib/cloudinary": moduleUrl(`export const cloudinary = { api: { delete_resources: async (ids) => {
    const state = globalThis.__setupTest; state.cloudCalls.push(ids);
    if (state.cloudResult instanceof Error) throw state.cloudResult;
    return state.cloudResult ?? {deleted: Object.fromEntries(ids.map(id => [id, "deleted"]))};
  } } };`),
  "next/server": moduleUrl("export const NextResponse = Response;"),
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (mocks[specifier]) return { url: mocks[specifier], shortCircuit: true };
  if (specifier.startsWith("@/")) return { url: new URL(specifier.slice(2) + ".ts", root).href, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    const candidate = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });

export const request = (body) => new Request("http://local/api", {
  method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body),
});
