/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load Node WebSocket packages directly so bundling does not break ws native helpers.
  serverExternalPackages: ["socket.io-client", "engine.io-client", "ws"],
  // ...your existing config
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
