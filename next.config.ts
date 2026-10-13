import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5000";
        return [
            {
                source: "/server/:path*",
                destination: `${process.env.BACKEND_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
