import { isTauriRuntime } from "@/lib/desktop/env";
import {
  getFileHandle,
  storeConfig,
  storeFileHandle,
  verifyPermission,
} from "./fileSystem";

export interface SyncDirectoryFile {
  name: string;
  content: string;
  modifiedAt: number;
}

/**
 * A directory used to mirror resumes as `<title>.json` files.
 *
 * Two backends exist because the File System Access API is Chromium-only:
 * browsers use a persisted `FileSystemDirectoryHandle`, while the Tauri shell
 * (macOS/Linux webviews included) talks to the Rust host instead.
 */
export interface SyncDirectory {
  label: string;
  writeFile(fileName: string, contents: string): Promise<void>;
  removeFile(fileName: string): Promise<void>;
  listJsonFiles(): Promise<SyncDirectoryFile[]>;
}

const folderLabel = (path: string) =>
  path.split(/[\\/]/).filter(Boolean).pop() ?? path;

const createTauriSyncDirectory = (path: string): SyncDirectory => ({
  label: folderLabel(path),
  async writeFile(fileName, contents) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_sync_file", { name: fileName, contents });
  },
  async removeFile(fileName) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("remove_sync_file", { name: fileName });
  },
  async listJsonFiles() {
    const { invoke } = await import("@tauri-apps/api/core");
    const files = await invoke<
      { name: string; content: string; modifiedMs: number }[]
    >("list_sync_files");
    return files.map((file) => ({
      name: file.name,
      content: file.content,
      modifiedAt: file.modifiedMs,
    }));
  },
});

const createBrowserSyncDirectory = (
  handle: FileSystemDirectoryHandle
): SyncDirectory => ({
  label: handle.name,
  async writeFile(fileName, contents) {
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  },
  async removeFile(fileName) {
    await handle.removeEntry(fileName);
  },
  async listJsonFiles() {
    const entries = (handle as unknown as { values?: () => AsyncIterable<any> })
      .values?.();
    if (!entries) {
      return [];
    }

    const files: SyncDirectoryFile[] = [];
    for await (const entry of entries) {
      if (entry.kind !== "file" || !entry.name.endsWith(".json")) {
        continue;
      }
      try {
        const file = await entry.getFile();
        files.push({
          name: entry.name,
          content: await file.text(),
          modifiedAt: file.lastModified,
        });
      } catch (error) {
        console.error(`Error reading resume file "${entry.name}":`, error);
      }
    }
    return files;
  },
});

/** Opens a picker and remembers the chosen directory. */
export const selectSyncDirectory = async (): Promise<SyncDirectory | null> => {
  if (isTauriRuntime()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const path = await invoke<string | null>("pick_sync_directory");
    return path ? createTauriSyncDirectory(path) : null;
  }

  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    throw new Error("directoryPickerUnsupported");
  }

  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  const granted = await verifyPermission(handle);
  if (!granted) {
    return null;
  }
  await storeFileHandle("syncDirectory", handle);
  await storeConfig("syncDirectoryPath", handle.name);
  return createBrowserSyncDirectory(handle);
};

/** Returns the previously selected directory, or null when none is usable. */
export const getSavedSyncDirectory =
  async (): Promise<SyncDirectory | null> => {
    if (isTauriRuntime()) {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string | null>("get_sync_directory");
      return path ? createTauriSyncDirectory(path) : null;
    }

    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return null;
    }

    const handle = await getFileHandle("syncDirectory");
    if (!handle || handle.kind !== "directory") {
      return null;
    }
    const granted = await verifyPermission(handle);
    if (!granted) {
      return null;
    }
    return createBrowserSyncDirectory(handle as FileSystemDirectoryHandle);
  };

export const clearSyncDirectory = async (): Promise<void> => {
  if (isTauriRuntime()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_sync_directory");
    return;
  }

  await storeFileHandle("syncDirectory", null as unknown as FileSystemHandle);
  await storeConfig("syncDirectoryPath", "");
};