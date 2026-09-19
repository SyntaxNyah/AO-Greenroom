import { defineConfig } from "vitest/config";

// `base: "./"` makes the built site work both from GitHub Pages (under a
// repo subpath) and from a locally-downloaded zip opened via file://, which is
// how the CI "download a build" artifact is meant to be used.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2500,
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
