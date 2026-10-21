import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";
import { env } from "node:process";
export default defineConfig({
  plugins: [plugin()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: Number(env.DEV_SERVER_PORT || 58500),
    proxy: {
      "^/api": { target: env.API_PROXY_TARGET || "http://localhost:3000" },
    },
  },
});
