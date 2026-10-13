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
import tiptapCss from "../styles/tiptap.scss?url";
import landingCss from "@/components/home/landing.css?url";
import sonnerCss from "sonner/dist/styles.css?url";
import { NextIntlClientProvider } from "@/i18n/compat/client";
import { useEffect, useState } from "react";
import zhMessages from "@/i18n/locales/zh.json";
import enMessages from "@/i18n/locales/en.json";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { getLocaleFromPathname, getPreferredLocale } from "@/i18n/runtime";
import { ReactGrab } from "@/components/dev/ReactGrab";
import { isTauriRuntime } from "@/lib/desktop/env";
import { installDesktopRuntime } from "@/lib/desktop/bootstrap";
import TitleBar from "@/components/desktop/TitleBar";

const defaultFontPreloadLinks = [
  {
    rel: "preload",
    href: "/fonts/AlibabaPuHuiTi-3-55-Regular.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "preload",
    href: "/fonts/AlibabaPuHuiTi-3-85-Bold.ttf",
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous" as const,
  },
];

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!isTauriRuntime()) return;

    const pathname = location.pathname.replace(/\/$/, "") || "/";
    const locale = getLocaleFromPathname(location.pathname);
    const isEntryPoint =
      pathname === "/" ||
      pathname === "/index.html" ||
      (locale !== null && pathname === `/${locale}`);

    if (isEntryPoint) {
      throw redirect({ to: "/app/dashboard/resumes" });
    }
  },
  head: ({ matches }) => ({
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
      {
        rel: "stylesheet",
        href: tiptapCss,
      },
      // Keep landing styles ready before client-side navigation renders the page.
      {
        rel: "stylesheet",
        href: landingCss,
      },
      // React owns this link, so toast styles survive a document remount.
      {
        rel: "stylesheet",
        href: sonnerCss,
      },
      ...(matches.some(
        (match) => getLocaleFromPathname(match.pathname) !== null,
      )
        ? []
        : [
            ...defaultFontPreloadLinks,
            {
              rel: "stylesheet",
              href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap",
            },
          ]),
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
  const landingLocale = getLocaleFromPathname(pathname);
  const isLandingPage =
    landingLocale !== null &&
    pathname.replace(/\/$/, "") === `/${landingLocale}`;
  const messages = locale === "en" ? enMessages : zhMessages;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  }, [locale]);

  useEffect(() => {
    // 模板预览等场景会以 iframe 复用本路由：iframe 内不再渲染标题栏、
    // 也不应用桌面偏移（真实标题栏只存在于顶层窗口）。
    if (!isTauriRuntime() || window.self !== window.top) return;
    installDesktopRuntime();
    setIsDesktop(true);
  }, []);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="icon" href="/favicon.ico?v=2" />
        <link rel="icon" href="/icon.png" />
      </head>
      <body>
        {isDesktop && <TitleBar />}
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="Asia/Shanghai"
        >
          <Providers forcedTheme={isLandingPage ? "light" : undefined}>
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
