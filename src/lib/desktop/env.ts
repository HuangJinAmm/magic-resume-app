/** True when the app runs inside the Tauri desktop shell. */
export const isTauriRuntime = (): boolean =>
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);