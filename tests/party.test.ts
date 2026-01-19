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
});
