import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    const backendUrl =
        process.env.BACKEND_URL ||
        "https://lexidesk-api-backend-fkg9fqgwfjg8hbgj.indiasouthcentral-01.azurewebsites.net";

    // Attempt to notify backend to invalidate if needed
    try {
        await fetch(`${backendUrl}/api/auth/logout`, {
            method: "POST",
            headers: {
                Cookie: request.headers.get("cookie") || "",
            },
        });
    } catch (err) {
        // Continue even if backend is unreachable
        console.error("Backend logout error:", err);
    }

    const response = NextResponse.json({ message: "Logged out successfully" });

    // Explicitly delete auth_token cookie on the frontend origin
    response.cookies.delete("auth_token");
    response.cookies.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: "lax",
    });

    return response;
}

