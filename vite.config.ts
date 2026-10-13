import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// `--mode desktop` produces a client-only SPA bundle (dist/client) for the
// Tauri shell. The default mode keeps the SSR/server build used for web deploy.
export default defineConfig(({ mode }) => {
  const isDesktop = mode === "desktop";

  return {
    server: {
      port: 3000,
      watch: {
        // Cargo 在编译期间会锁定 target 内的 dll/产物，Windows 上监视被锁文件会抛 EBUSY。
        ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**"]
      }
    },
    optimizeDeps: {
      exclude: ["pdfjs-dist"]
    },
    ssr: {
      noExternal: ["pdfjs-dist"]
    },
    plugins: [
      tsconfigPaths(),
      tanstackStart({
        srcDirectory: "src",
        router: {
          routesDirectory: "routes"
        },
        // Emit a single client-rendered shell at dist/client/index.html so the
        // desktop webview can boot the router without a Node server.
        spa: isDesktop
          ? {
              enabled: true,
              maskPath: "/",
              prerender: {
                outputPath: "/index",
                crawlLinks: false
              }
            }
          : undefined
      }),
      viteReact()
    ]
  };
});