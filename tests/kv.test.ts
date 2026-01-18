import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { storeGuestMappings, getGuestMapping } from "../src/kv";

describe("KV Functions", () => {
  beforeEach(async () => {
    const keys = await env.GUEST_KV.list();
    await Promise.all(keys.keys.map((key) => env.GUEST_KV.delete(key.name)));
  });

  describe("storeGuestMappings", () => {
    it("should store guest mappings correctly", async () => {
      const guestMappings = [
        { guestId: "123e4567-e89b-12d3-a456-426614174000", guestName: "Alice" },
        { guestId: "123e4567-e89b-12d3-a456-426614174001", guestName: "Bob" },
      ];
      const partyId = "party-123";

      await storeGuestMappings(env.GUEST_KV, guestMappings, partyId);

      const aliceMapping = await env.GUEST_KV.get(`guest:${guestMappings[0].guestId}`);
      expect(aliceMapping).toBeTruthy();

      const parsed = JSON.parse(aliceMapping!);
      expect(parsed).toEqual({
        partyId: "party-123",
        guestName: "Alice",
      });
    });

    it("should store empty mappings array", async () => {
      await storeGuestMappings(env.GUEST_KV, [], "party-123");
      const keys = await env.GUEST_KV.list();
      expect(keys.keys).toHaveLength(0);
    });
  });

  describe("getGuestMapping", () => {
    it("should retrieve correct mapping for existing guestId", async () => {
      const guestId = "123e4567-e89b-12d3-a456-426614174000";
      const mappingData = { partyId: "party-123", guestName: "Alice" };
      await env.GUEST_KV.put(`guest:${guestId}`, JSON.stringify(mappingData));

      const result = await getGuestMapping(env.GUEST_KV, guestId);

      expect(result).toEqual(mappingData);
    });

    it("should return null for non-existent guestId", async () => {
      const result = await getGuestMapping(env.GUEST_KV, "non-existent-id");
      expect(result).toBeNull();
    });

    it("should handle malformed JSON gracefully", async () => {
      const guestId = "123e4567-e89b-12d3-a456-426614174000";
      await env.GUEST_KV.put(`guest:${guestId}`, "invalid json");

      await expect(getGuestMapping(env.GUEST_KV, guestId)).rejects.toThrow();
    });
  });
});
