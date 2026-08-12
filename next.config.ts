import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Avoid bundling firebase-admin (jwks-rsa/jose ESM conflict on Vercel).
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
};

export default withNextIntl(nextConfig);
