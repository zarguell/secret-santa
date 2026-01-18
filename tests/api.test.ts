import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import worker from "../src/index";

describe("API Endpoints", () => {
  describe("POST /api/parties", () => {
    it("should create a party with valid data", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob"],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("partyId");
      expect(data).toHaveProperty("guestUrls");
      expect(data).toHaveProperty("party");
      expect(data.party.name).toBe("Test Party");
    });

    it("should return 400 for missing name", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          guests: ["Alice", "Bob"],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it("should return 400 for less than 2 guests", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice"],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it("should return 400 for more than 50 guests", async () => {
      const guests = Array.from({ length: 51 }, (_, i) => `Guest${i}`);
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests,
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Maximum 50 guests");
    });

    it("should return 400 for duplicate guest names", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Alice", "Bob"],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("unique");
    });

    it("should handle optional budget and criteria fields", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob"],
          budget: "$50",
          criteria: "No clothes",
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.party.budget).toBe("$50");
      expect(data.party.criteria).toBe("No clothes");
    });

    it("should include CORS headers", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob"],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    });
  });

  describe("GET /api/guest/:id/assignment", () => {
    let guestId: string;

    beforeEach(async () => {
      const createRequest = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob"],
        }),
      });

      const createResponse = await worker.fetch(createRequest, env, {} as ExecutionContext);
      const createData = await createResponse.json();
      const guestUrl = createData.guestUrls.Alice;
      guestId = guestUrl.split("/").pop();
    });

    it("should return assignment for valid guest ID", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/assignment`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("guestName");
      expect(data).toHaveProperty("assignment");
      expect(data).toHaveProperty("party");
      expect(data.guestName).toBe("Alice");
    });

    it("should return 404 for non-existent guest", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/assignment`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });

    it("should return 404 for non-existent guest ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/assignment`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should include CORS headers", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/assignment`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("OPTIONS requests", () => {
    it("should handle CORS preflight", async () => {
      const request = new Request("http://localhost/api/parties", {
        method: "OPTIONS",
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    });
  });

  describe("GET /guest/:id", () => {
    it("should return HTML for valid guest ID", async () => {
      const createRequest = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob"],
        }),
      });

      const createResponse = await worker.fetch(createRequest, env, {} as ExecutionContext);
      const createData = await createResponse.json<{
        guestUrls: { [key: string]: string };
      }>();

      const guestUrl = createData.guestUrls.Alice;
      const guestId = guestUrl.split("/").pop();
      const validGuestPath = `/guest/${guestId}`;

      const request = new Request(`http://localhost${validGuestPath}`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("Your Secret Santa Assignment");
      expect(html).toContain("/guest.js");
      expect(html).toContain("/style.css");
    });

    it("should return 400 for invalid guest ID format", async () => {
      const request = new Request("http://localhost/guest/invalid-id");

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toContain("Invalid guest link");
    });

    it("should return 404 for non-existent guest ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/guest/${fakeId}`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toContain("Guest link not found");
    });
  });

  describe("404 routes", () => {
    it("should return 404 for undefined routes", async () => {
      const request = new Request("http://localhost/undefined-route");

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });
  });
});
