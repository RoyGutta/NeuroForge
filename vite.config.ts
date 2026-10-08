import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

/** Serves /api/interpret in development through the same handler the Vercel function uses. */
function devApi(): Plugin {
  return {
    name: "neuroforge-dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/interpret", async (req, res) => {
        const mod = (await server.ssrLoadModule("/src/server/node.ts")) as { serveNode: (q: typeof req, s: typeof res) => Promise<void> };
        await mod.serveNode(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
});
