import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 * - Razorpay Checkout: script from checkout.razorpay.com, iframe + XHR to api.razorpay.com.
 * - Daily.co live video: iframe + websocket to *.daily.co.
 * - MinIO images: any https host (and http on localhost for dev).
 * 'unsafe-inline' on script-src is required by Next.js's inline bootstrap until
 * nonce-based CSP is wired up; frame-ancestors 'none' still blocks clickjacking.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isDev ? " http://localhost:*" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://*.daily.co wss://*.daily.co${isDev ? " http://localhost:* ws://localhost:*" : ""}`,
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.daily.co",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // camera/mic/display-capture use "*" because Daily.co live-video iframes are
  // served from a per-account *.daily.co origin that can't be enumerated here;
  // the browser still gates each on a user permission prompt.
  { key: "Permissions-Policy", value: "camera=*, microphone=*, display-capture=*, geolocation=(), payment=*, browsing-topics=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Pin the workspace root so Next doesn't guess it from a parent lockfile.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
