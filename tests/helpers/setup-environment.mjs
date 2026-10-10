import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
  "@/lib/cloudinary": moduleUrl(`
    export const signUpload = () => ({timestamp: 123, signature: "test", apiKey: "test"});
    export const thumbnailUrl = (id) => "https://test.invalid/w_480/" + id;
    export const cloudinary = { api: { delete_resources: async (ids) => {
    const state = globalThis.__setupTest; state.cloudCalls.push(ids);
    if (state.cloudResult instanceof Error) throw state.cloudResult;
    return state.cloudResult ?? {deleted: Object.fromEntries(ids.map(id => [id, "deleted"]))};
  } } };`),
  "@/lib/env": moduleUrl("export const env = { CLOUDINARY_CLOUD_NAME: 'test' };"),
  "@/lib/sse": moduleUrl("export const broadcastPhotoAdded = () => {}; export const broadcastSlideshow = () => {}; export const broadcastPhotosChanged = () => {};"),
  "next/server": moduleUrl("export const NextResponse = Response;"),
  "next/navigation": moduleUrl("export const useRouter = () => ({replace() {}, refresh() {}}); export const notFound = () => { throw new Error('TEST_NOT_FOUND'); };"),
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (mocks[specifier]) return { url: mocks[specifier], shortCircuit: true };
  if (specifier === "next/image" || specifier === "next/link") return nextResolve(`${specifier}.js`, context);
  if (specifier.startsWith("@/")) {
    const file = new URL(specifier.slice(2) + ".ts", root);
    return {url: existsSync(fileURLToPath(file)) ? file.href : new URL(specifier.slice(2) + ".tsx", root).href, shortCircuit: true};
  }
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    const candidate = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}, load(url, context, nextLoad) {
  if (url.endsWith(".tsx")) return {format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText};
  return nextLoad(url, context);
} });

export const request = (body) => new Request("http://local/api", {
  method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body),
});
