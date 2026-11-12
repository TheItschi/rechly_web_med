import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

/** Commit/branch of the build for the AGPL source link (works without git binary). */
function readGitInfo(): { commit: string; branch: string } {
    if (process.env.GIT_COMMIT) return { commit: process.env.GIT_COMMIT, branch: process.env.GIT_BRANCH || "" };
    try {
        const head = readFileSync(".git/HEAD", "utf8").trim();
        if (!head.startsWith("ref: ")) return { commit: head, branch: "" };
        const ref = head.slice(5);
        const branch = ref.replace(/^refs\/heads\//, "");
        try {
            return { commit: readFileSync(`.git/${ref}`, "utf8").trim(), branch };
        } catch {
            const packed = readFileSync(".git/packed-refs", "utf8").split("\n").find((l) => l.endsWith(` ${ref}`));
            return { commit: packed?.split(" ")[0] ?? "", branch };
        }
    } catch {
        return { commit: "", branch: "" };
    }
}
const git = readGitInfo();
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string };

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_SOURCE_COMMIT: git.commit,
        NEXT_PUBLIC_SOURCE_BRANCH: git.branch,
        NEXT_PUBLIC_APP_VERSION: pkg.version ?? "",
    },

    // Standalone output for containerized deployments (Heroku, Docker, etc.)
    output: "standalone",

    // Keep pdfkit (ZUGFeRD) out of the bundle: it loads its standard fonts
    // (*.afm) from node_modules/pdfkit/js/data at runtime, which are missing
    // once bundled.
    serverExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
        "/api/invoices/[id]/zugferd": ["./node_modules/pdfkit/js/data/**", "./public/fonts/liberation/**"],
    },

    // Disable type checking during build (we run it separately)
    typescript: {
        ignoreBuildErrors: false,
    },

    // Use Turbopack (Next.js 16 default)
    turbopack: {
        // Resolve aliases for react-pdf compatibility
        resolveAlias: {
            canvas: { browser: "./empty-module.js" },
        },
    },

    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-Robots-Tag",
                        value: "noindex, nofollow, noarchive",
                    },
                ],
            },
        ];
    },

    // Optimizations
    experimental: {
        optimizePackageImports: [
            "antd",
            "@ant-design/icons",
            "dayjs",
            "@ant-design/nextjs-registry",
        ],
    },
};

export default nextConfig;
