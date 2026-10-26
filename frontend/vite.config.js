import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

// Build stamp shown in the UI to confirm which commit is deployed.
// The VPS deploy script runs `git pull` + `npm run build`, so git is available here.
function buildVersion() {
  let hash = "dev";
  try { hash = execSync("git rev-parse --short HEAD").toString().trim(); } catch {}
  const time = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16);
  return `${hash} · ${time}`;
}
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(buildVersion()) },
  base: "/jobtracker/",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8001",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
