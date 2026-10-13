import { invoke } from "@tauri-apps/api/core";
import { installDesktopApiBridge } from "@/lib/desktop/api-bridge";
import { isTauriRuntime } from "@/lib/desktop/env";

const TITLEBAR_HEIGHT = 36;

let installed = false;

const isExternalUrl = (url: string): boolean =>
  /^https?:\/\//i.test(url) &&
  !url.startsWith(window.location.origin) &&
  !url.startsWith("http://tauri.localhost") &&
  !url.startsWith("https://tauri.localhost");

/**
 * Opens external links in the OS default browser instead of navigating the
 * desktop webview away from the app.
 */
function installExternalLinkHandler() {
  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href) return;
      if (anchor.getAttribute("target") !== "_blank" && !isExternalUrl(href)) {
        return;
      }
      if (!isExternalUrl(href)) return;

      event.preventDefault();
      void invoke("open_external", { url: href }).catch(() => {
        window.open(href, "_blank", "noopener,noreferrer");
      });
    },
    true,
  );
}

/** Installs desktop-only runtime patches. Safe to call multiple times. */
export function installDesktopRuntime() {
  if (installed || !isTauriRuntime()) return;
  installed = true;

  document.documentElement.style.setProperty(
    "--desktop-titlebar-height",
    `${TITLEBAR_HEIGHT}px`,
  );
  document.documentElement.classList.add("is-desktop");

  installDesktopApiBridge();
  installExternalLinkHandler();
}