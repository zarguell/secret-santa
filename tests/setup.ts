import { env } from "cloudflare:test";
import { afterEach } from "vitest";

afterEach(async () => {
  if (env.GUEST_KV) {
    const keys = await env.GUEST_KV.list();
    await Promise.all(keys.keys.map((key) => env.GUEST_KV.delete(key.name)));
  }
});
