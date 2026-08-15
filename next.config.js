/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output = a self-contained server bundle with only the
  // node_modules it actually needs, which is what the Dockerfile copies
  // into the final image (keeps it well under the size of a full
  // node_modules install).
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    // The brand mark is served as an SVG wrapping a small embedded PNG
    // (see scripts/make_icons.py) - next/image blocks local SVGs by
    // default, so this needs to be opted in explicitly. The CSP below
    // is the setting Next's own docs recommend for this: it disables
    // script execution inside the SVG.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
