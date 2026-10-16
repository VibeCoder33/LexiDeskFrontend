import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const authToken = request.cookies.get("auth_token")?.value;

    // 1. Explicitly allow public portal routes, static assets, and api proxies
    if (
        pathname.startsWith("/portal") ||
        pathname.startsWith("/server") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico")
    ) {
        return NextResponse.next();
    }

    // 2. Root route: redirect based on auth status
    if (pathname === "/") {
        if (authToken) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 3. Login page: redirect to /dashboard if already authenticated (unless explicit logout)
    if (pathname === "/login") {
        if (request.nextUrl.searchParams.get("logout") === "true") {
            const response = NextResponse.next();
            response.cookies.delete("auth_token");
            response.cookies.set("auth_token", "", {
                path: "/",
                maxAge: 0,
                expires: new Date(0),
            });
            return response;
        }
        if (authToken) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // 4. Protected dashboard routes: require auth token
    if (pathname.startsWith("/dashboard")) {
        if (!authToken) {
            const loginUrl = new URL("/login", request.url);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
