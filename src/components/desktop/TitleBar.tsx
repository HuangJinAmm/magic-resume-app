import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";

type WindowAction = "minimize" | "toggleMaximize" | "close";

/**
 * Custom titlebar for the frameless desktop window.
 * Rendered only when running inside the Tauri shell.
 */
export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    void appWindow.isMaximized().then(setMaximized);
    void appWindow
      .onResized(() => {
        void appWindow.isMaximized().then(setMaximized);
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => unlisten?.();
  }, []);

  const handleAction = async (action: WindowAction) => {
    const appWindow = getCurrentWindow();
    if (action === "minimize") {
      await appWindow.minimize();
    } else if (action === "toggleMaximize") {
      await appWindow.toggleMaximize();
    } else {
      await appWindow.close();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "fixed inset-x-0 top-0 z-[9999] flex h-9 items-center justify-between",
        "border-b border-border/40 bg-background/80 backdrop-blur-md select-none",
      )}
    >
      <div
        data-tauri-drag-region
        className="flex h-full flex-1 items-center gap-2 px-3 text-xs font-medium text-muted-foreground"
      >
        <span data-tauri-drag-region className="truncate">
          Magic Resume
        </span>
      </div>

      <div className="flex h-full items-stretch">
        <TitleBarButton
          label="Minimize"
          onClick={() => handleAction("minimize")}
        >
          <Minus className="h-3.5 w-3.5" />
        </TitleBarButton>
        <TitleBarButton
          label={maximized ? "Restore" : "Maximize"}
          onClick={() => handleAction("toggleMaximize")}
        >
          {maximized ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </TitleBarButton>
        <TitleBarButton
          label="Close"
          danger
          onClick={() => handleAction("close")}
        >
          <X className="h-4 w-4" />
        </TitleBarButton>
      </div>
    </div>
  );
}

function TitleBarButton({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex w-11 items-center justify-center text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        danger && "hover:bg-red-500 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}