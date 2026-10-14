import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import appCss from "../app/globals.css?url";
import appFontCss from "../app/font.css?url";
import sonnerCss from "sonner/dist/styles.css?url";
import { NextIntlClientProvider } from "@/i18n/compat/client";
import { useEffect } from "react";
import zhMessages from "@/i18n/locales/zh.json";
import enMessages from "@/i18n/locales/en.json";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { getPreferredLocale } from "@/i18n/runtime";
import { ReactGrab } from "@/components/dev/ReactGrab";
import { isTauriRuntime } from "@/lib/desktop/env";
import { installDesktopRuntime } from "@/lib/desktop/bootstrap";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!isTauriRuntime()) return;

    // 桌面端静态入口（SPA 兜底页）直接进入工作区，避免短暂展示 not-found。
    const pathname = location.pathname.replace(/\/$/, "") || "/";
    if (pathname === "/index.html") {
      throw redirect({ to: "/app/dashboard/resumes" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Magic Resume" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: appFontCss,
      },
      // React owns this link, so toast styles survive a document remount.
      {
        rel: "stylesheet",
        href: sonnerCss,
      },
      // 标题字体 Newsreader 自托管（latin 子集），避免渲染阻塞的外链请求。
      // 简历正文字体 Alibaba PuHuiTi 体积大、仅用于简历文档，不再全局 preload，
      // 由 @font-face 按需加载（font-display: swap）。
      {
        rel: "preload",
        href: "/fonts/Newsreader-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: RootNotFound,
});

function RootComponent() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const locale = getPreferredLocale(pathname);
  const messages = locale === "en" ? enMessages : zhMessages;

  useEffect(() => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  }, [locale]);

  useEffect(() => {
    // 模板预览等场景会以 iframe 复用本路由，桌面运行时只在顶层窗口安装一次。
    if (!isTauriRuntime() || window.self !== window.top) return;
    installDesktopRuntime();
  }, []);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="icon" href="/favicon.ico?v=2" />
        <link rel="icon" href="/icon.png" />
      </head>
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="Asia/Shanghai"
        >
          <Providers>
            <ReactGrab />
            <Outlet />
            <Toaster position="top-center" richColors />
          </Providers>
        </NextIntlClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">页面不存在</p>
    </main>
  );
}
