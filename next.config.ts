import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        // Provide the live Azure backend URL as the fallback for the GitHub Actions build
        const backendUrl =
            process.env.BACKEND_URL ||
            "https://lexidesk-api-backend-fkg9fqgwfjg8hbgj.indiasouthcentral-01.azurewebsites.net";

        return [
            {
                source: "/server/:path*",
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
