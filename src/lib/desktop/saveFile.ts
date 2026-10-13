import { isTauriRuntime } from "@/lib/desktop/env";

/**
 * Persists a generated file to disk.
 *
 * In the desktop shell the webview cannot reliably trigger a `<a download>`
 * on every platform, so the native save dialog is used instead. On the web the
 * regular anchor download is kept.
 */
export async function saveFileToDisk(blob: Blob, fileName: string): Promise<void> {
  if (isTauriRuntime()) {
    const [{ save }, { invoke }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/api/core"),
    ]);

    const path = await save({ defaultPath: fileName });
    if (!path) return;

    const contents = Array.from(new Uint8Array(await blob.arrayBuffer()));
    await invoke("write_export_file", { path, contents });
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}