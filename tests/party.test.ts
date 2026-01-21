import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { Party } from "../src/party";

describe("Party Durable Object", () => {
  let partyStub: DurableObjectStub<Party>;
  let partyId: string;

  it("should create a party with 2 guests", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    const result = await partyStub.createParty({
      name: "Test Party",
      budget: "$50",
      criteria: "No clothes",
      guests: ["Alice", "Bob"],
    });

    expect(result.partyId).toBe(partyId.toString());
    expect(result.guestUrls).toHaveProperty("Alice");
    expect(result.guestUrls).toHaveProperty("Bob");
    expect(result.guestMappings).toHaveLength(2);
  });

  it("should generate unique guest IDs", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    const result = await partyStub.createParty({
      name: "Test Party",
      guests: ["Alice", "Bob", "Charlie"],
    });

    const guestIds = result.guestMappings.map((m) => m.guestId);
    const uniqueIds = new Set(guestIds);
    expect(uniqueIds.size).toBe(3);
  });

  it("should handle optional budget and criteria fields", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    await partyStub.createParty({
      name: "Test Party",
      guests: ["Alice", "Bob"],
    });

    const party = await partyStub.getParty();
    expect(party.budget).toBeUndefined();
    expect(party.criteria).toBeUndefined();
  });

  it("should store party data in DO storage", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    await partyStub.createParty({
      name: "Test Party",
      budget: "$50",
      criteria: "No clothes",
      guests: ["Alice", "Bob"],
    });

    const party = await partyStub.getParty();
    expect(party.name).toBe("Test Party");
    expect(party.budget).toBe("$50");
    expect(party.criteria).toBe("No clothes");
    expect(party.guests).toEqual(["Alice", "Bob"]);
    expect(party.createdAt).toBeTruthy();
  });

  it("should return assignment for valid guest", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    const createResult = await partyStub.createParty({
      name: "Test Party",
      guests: ["Alice", "Bob", "Charlie"],
    });

    const guestId = createResult.guestMappings.find(
      (m) => m.guestName === "Alice",
    )!.guestId;
    const result = await partyStub.getGuestAssignment(guestId);

    expect(result.guestName).toBe("Alice");
    expect(result.assignment).toBeTruthy();
    expect(result.party).toHaveProperty("name");
    expect(result.party).toHaveProperty("guests");
  });

  it("should return assignment for guest via assignGift", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    await partyStub.createParty({
      name: "Test Party",
      guests: ["Alice", "Bob"],
    });

    const result = await partyStub.assignGift({ guestName: "Alice" });

    expect(result.assignment).toBeTruthy();
    expect(result.partyName).toBe("Test Party");
  });

  it("should return complete party data via getParty", async () => {
    partyId = env.PARTY_DO.newUniqueId();
    partyStub = env.PARTY_DO.get(partyId);

    await partyStub.createParty({
      name: "Test Party",
      budget: "$50",
      criteria: "No clothes",
      guests: ["Alice", "Bob"],
    });

    const party = await partyStub.getParty();

    expect(party.name).toBe("Test Party");
    expect(party.budget).toBe("$50");
    expect(party.criteria).toBe("No clothes");
    expect(party.guests).toEqual(["Alice", "Bob"]);
    expect(party.assignments).toBeTruthy();
    expect(party.guestLinks).toBeTruthy();
    expect(party.createdAt).toBeTruthy();
  });

  describe("Wishlist Storage", () => {
    it("should store and retrieve wishlist for a guest", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // Set wishlist
      await partyStub.setWishlist(guestId, "I want a new coffee maker");

      // Get wishlist
      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe("I want a new coffee maker");
    });

    it("should return empty string for missing wishlist", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // Get wishlist without setting it
      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe("");
    });

    it.skip("should reject wishlist exceeding 500 characters", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // Try to set wishlist with 501 characters
      const longWishlist = "x".repeat(501);

      let errorThrown = false;
      try {
        await partyStub.setWishlist(guestId, longWishlist);
      } catch (e) {
        errorThrown = true;
        expect((e as Error).message).toBe(
          "Wishlist must be 500 characters or less",
        );
      }
      expect(errorThrown).toBe(true);
    });

    it("should accept wishlist exactly 500 characters", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // Set wishlist with exactly 500 characters
      const maxWishlist = "x".repeat(500);

      await partyStub.setWishlist(guestId, maxWishlist);
      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe(maxWishlist);
      expect(result.length).toBe(500);
    });

    it.skip("should reject non-string wishlist", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // @ts-expect-error - Testing type validation
      let errorThrown = false;
      try {
        await partyStub.setWishlist(guestId, null as any);
      } catch (e) {
        errorThrown = true;
        expect((e as Error).message).toBe("Wishlist must be a string");
      }
      expect(errorThrown).toBe(true);

      // @ts-expect-error - Testing type validation
      errorThrown = false;
      try {
        await partyStub.setWishlist(guestId, 123 as any);
      } catch (e) {
        errorThrown = true;
        expect((e as Error).message).toBe("Wishlist must be a string");
      }
      expect(errorThrown).toBe(true);
    });

    it.skip("should reject wishlist for non-existent guest", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      // Use a fake guest ID
      const fakeGuestId = crypto.randomUUID();

      let errorThrown = false;
      try {
        await partyStub.setWishlist(fakeGuestId, "I want a coffee maker");
      } catch (e) {
        errorThrown = true;
        expect((e as Error).message).toBe("Guest not found in this party");
      }
      expect(errorThrown).toBe(true);
    });

    it("should store separate wishlists for different guests", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob", "Charlie"],
      });

      const aliceId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;
      const bobId = createResult.guestMappings.find(
        (m) => m.guestName === "Bob",
      )!.guestId;

      await partyStub.setWishlist(aliceId, "Alice wants books");
      await partyStub.setWishlist(bobId, "Bob wants games");

      const aliceWishlist = await partyStub.getWishlist(aliceId);
      const bobWishlist = await partyStub.getWishlist(bobId);

      expect(aliceWishlist).toBe("Alice wants books");
      expect(bobWishlist).toBe("Bob wants games");
    });

    it("should handle empty wishlist updates", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      // Set a wishlist
      await partyStub.setWishlist(guestId, "I want a coffee maker");

      // Update to empty string
      await partyStub.setWishlist(guestId, "");

      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe("");
    });

    it("should handle Unicode characters in wishlist", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      const unicodeWishlist = "🎁 我想一个咖啡机 ☕ Привет";

      await partyStub.setWishlist(guestId, unicodeWishlist);
      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe(unicodeWishlist);
    });

    it("should handle newlines and special characters", async () => {
      partyId = env.PARTY_DO.newUniqueId();
      partyStub = env.PARTY_DO.get(partyId);

      const createResult = await partyStub.createParty({
        name: "Test Party",
        guests: ["Alice", "Bob"],
      });

      const guestId = createResult.guestMappings.find(
        (m) => m.guestName === "Alice",
      )!.guestId;

      const multilineWishlist = "Item 1\nItem 2\nItem 3\tTabs too!";

      await partyStub.setWishlist(guestId, multilineWishlist);
      const result = await partyStub.getWishlist(guestId);

      expect(result).toBe(multilineWishlist);
    });
  });
});
