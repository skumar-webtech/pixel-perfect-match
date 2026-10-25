// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const mode = process.env["NODE_ENV"] === "production" ? "production" : "development";
const serverEnv = loadEnv(mode, process.cwd(), "");

if (!process.env["GROQ_API_KEY"] && serverEnv["GROQ_API_KEY"]) {
  process.env["GROQ_API_KEY"] = serverEnv["GROQ_API_KEY"];
}
if (!process.env["GROQ_MODEL"] && serverEnv["GROQ_MODEL"]) {
  process.env["GROQ_MODEL"] = serverEnv["GROQ_MODEL"];
}

export default defineConfig({
  vite: {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
