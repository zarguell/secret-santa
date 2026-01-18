import { describe, it, expect } from "vitest";
import { generateAssignments } from "../src/utils";

describe("generateAssignments", () => {
  it("should create valid assignments for 2 guests", () => {
    const guests = ["Alice", "Bob"];
    const assignments = generateAssignments(guests);

    expect(assignments).toHaveProperty("Alice");
    expect(assignments).toHaveProperty("Bob");
    expect(assignments.Alice).not.toBe("Alice");
    expect(assignments.Bob).not.toBe("Bob");
  });

  it("should create valid assignments for 5 guests", () => {
    const guests = ["Alice", "Bob", "Charlie", "David", "Eve"];
    const assignments = generateAssignments(guests);

    expect(Object.keys(assignments)).toHaveLength(5);
    guests.forEach((guest) => {
      expect(assignments).toHaveProperty(guest);
      expect(assignments[guest]).not.toBe(guest);
    });
  });

  it("should throw error for less than 2 guests", () => {
    expect(() => generateAssignments([])).toThrow("At least 2 guests required");
    expect(() => generateAssignments(["Alice"])).toThrow("At least 2 guests required");
  });

  it("should assign all guests exactly once as givers", () => {
    const guests = ["Alice", "Bob", "Charlie"];
    const assignments = generateAssignments(guests);

    const givers = Object.keys(assignments);
    expect(givers.sort()).toEqual(guests.sort());
  });

  it("should assign all guests exactly once as receivers", () => {
    const guests = ["Alice", "Bob", "Charlie"];
    const assignments = generateAssignments(guests);

    const receivers = Object.values(assignments);
    expect(receivers.sort()).toEqual(guests.sort());
  });
});
