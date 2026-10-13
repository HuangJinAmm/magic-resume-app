import { handleTextRequest } from "@/lib/server/ai-text";
import { handleModelsRequest } from "@/lib/server/ai-models";
import { handleResumeImport } from "@/lib/server/resume-import";
import { handleImageProxy } from "@/lib/server/image-proxy";
import { isTauriRuntime } from "./env";

let installed = false;

/**
 * The web build serves these endpoints from TanStack Start server routes.
 * The desktop build has no server, so we answer the same `/api/*` calls inside
 * the webview. Requests leave the app through the Tauri HTTP plugin, which runs
 * in Rust and therefore bypasses the webview's CORS restrictions.
 */
async function dispatch(
  request: Request,
  fetcher: typeof fetch
): Promise<Response> {
  const { pathname } = new URL(request.url);

  switch (pathname) {
    case "/api/polish":
      return handleTextRequest(request, "polish", fetcher);
    case "/api/grammar":
      return handleTextRequest(request, "grammar", fetcher);
    case "/api/ai-test":
      return handleTextRequest(request, "test", fetcher);
    case "/api/models":
      return handleModelsRequest(request, fetcher);
    case "/api/resume-import":
      return handleResumeImport(request, fetcher);
    case "/api/proxy/image":
      return handleImageProxy(request, fetcher);
    default:
      return Response.json({ code: "notFound" }, { status: 404 });
  }
}

function toRequest(input: RequestInfo | URL, init?: RequestInit) {
  try {
    if (typeof input === "string" || input instanceof URL) {
      return new Request(new URL(String(input), window.location.href), init);
    }
    if (input instanceof Request) {
      return init ? new Request(input, init) : input;
    }
  } catch {
    return null;
  }
  return null;
}

/** Patches window.fetch so `/api/*` calls resolve against the local handlers. */
export function installDesktopApiBridge() {
  if (installed || !isTauriRuntime()) {
    return;
  }
  installed = true;

  const originalFetch = window.fetch.bind(window);
  let tauriFetchPromise: Promise<typeof fetch> | null = null;
  const getTauriFetch = () =>
    (tauriFetchPromise ??= import("@tauri-apps/plugin-http").then(
      (mod) => mod.fetch as unknown as typeof fetch
    ));

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = toRequest(input, init);
    if (!request) {
      return originalFetch(input, init);
    }

    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    const fetcher = await getTauriFetch();
    return dispatch(request, fetcher);
  };
}