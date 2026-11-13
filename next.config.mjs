/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load Node WebSocket packages directly so bundling does not break ws native helpers.
  serverExternalPackages: ["socket.io-client", "engine.io-client", "ws"],
  async headers() {
    return ["/login", "/register"].map(source => ({ source, headers: [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }));
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
