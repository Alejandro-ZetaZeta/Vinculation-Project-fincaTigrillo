import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactCompiler: !isDev,
  serverExternalPackages: ['nodemailer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.insforge.app',
      },
    ],
  },
  async headers() {
    return [
      {
        // Security headers applied to every route.
        // CORS is handled dynamically in proxy.ts — no static CORS block here.
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for 2 years once the first secure response is seen
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Restrict unused browser APIs
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy
          // 'unsafe-inline' in script-src is required for the anti-flash
          // theme script in layout.tsx (dangerouslySetInnerHTML).
          // 'unsafe-eval' is intentionally omitted — not needed in production.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is needed in dev for Next.js hot-reload; stripped in production
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,

              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.insforge.app",
              "manifest-src 'self'",
              "worker-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

