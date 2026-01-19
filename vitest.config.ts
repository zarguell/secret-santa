import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        main: "./src/index.ts",
        isolatedStorage: true,
        miniflare: {
          compatibilityDate: "2025-11-21",
          compatibilityFlags: ["nodejs_compat"],
          durableObjects: {
            PARTY_DO: {
              className: "Party",
              scriptPath: "./src/party.ts",
            },
          },
          kvNamespaces: ["GUEST_KV"],
          bindings: {
            PARTY_DO: {
              type: "durable-object",
              className: "Party",
            },
            GUEST_KV: {
              type: "kv",
            },
            ASSETS: {
              type: "assets",
              directory: "./public",
            },
          },
        },
      },
    },
  },
});
