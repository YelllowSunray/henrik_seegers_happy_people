import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const mediaCache = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/videos/:path*", headers: mediaCache },
      { source: "/audio/:path*", headers: mediaCache },
    ];
  },
  // Avoid bundling firebase-admin (jwks-rsa/jose ESM conflict on Vercel).
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
};

export default withNextIntl(nextConfig);
