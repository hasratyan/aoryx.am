import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, Locale } from "@/lib/i18n";

const PUBLIC_FILE = /\.(.*)$/;

function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split("/");
  const potentialLocale = segments[1];
  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale;
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public files, API routes, and Next.js internals
  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check if the pathname already has a locale
  const pathnameLocale = getLocaleFromPath(pathname);
  if (pathnameLocale) {
    // Locale is already in the path, continue
    return NextResponse.next();
  }

  // No locale in path - redirect to default locale or stored preference
  // Try to get locale from cookie (set by language switcher)
  const cookieLocale = request.cookies.get("megatours-locale")?.value as Locale | undefined;
  const locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;

  // Redirect to the locale-prefixed path
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
