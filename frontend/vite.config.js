import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main:     resolve(__dirname, "index.html"),
        protocol: resolve(__dirname, "protocol.html"),
      },
    },
  },
});
