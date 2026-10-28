import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseInstallationConfig } from "./lib/installation-config.ts";

const installation = parseInstallationConfig(process.env);

function hostName(request: NextRequest) {
  try { return new URL(`http://${request.headers.get("host")}`).hostname.toLowerCase(); }
  catch { return ""; }
}

export function proxy(request: NextRequest) {
  const host = hostName(request);
  const localDevelopment = process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(host);
  if (host !== installation.EVENT_HOSTNAME && !localDevelopment) {
    return new Response("Not found", { status: 404 });
  }

  const path = request.nextUrl.pathname;
  if (path === "/" || path === "/upload" || path === "/live" || path === "/galeria") {
    const destination = path === "/" ? `/${installation.EVENT_SLUG}` : `/${installation.EVENT_SLUG}${path}`;
    const target = request.nextUrl.clone();
    target.pathname = destination;
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
