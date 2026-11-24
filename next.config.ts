import type { NextConfig } from "next";

// Cache Components is off on purpose: every PressBoard screen reads the
// signed-in user's session and live shop data, so pages render per request.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
