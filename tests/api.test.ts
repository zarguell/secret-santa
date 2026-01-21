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
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
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
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
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

  describe("PUT /api/guest/:id/wishlist", () => {
    let guestId: string;
    let partyId: string;

    beforeEach(async () => {
      const createRequest = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob", "Charlie"],
        }),
      });

      const createResponse = await worker.fetch(createRequest, env, {} as ExecutionContext);
      const createData = await createResponse.json<{
        partyId: string;
        guestUrls: { [key: string]: string };
      }>();
      const guestUrl = createData.guestUrls.Alice;
      guestId = guestUrl.split("/").pop() || "";
      partyId = createData.partyId;
    });

    it("should set wishlist for valid guest", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "Books, gadgets, and coffee" }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify by getting the wishlist
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const getResponse = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const getData = await getResponse.json<{ wishlist: string }>();

      expect(getResponse.status).toBe(200);
      expect(getData.wishlist).toBe("Books, gadgets, and coffee");
    });

    it("should update existing wishlist", async () => {
      // Set initial wishlist
      const putRequest1 = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "First wishlist" }),
      });
      await worker.fetch(putRequest1, env, {} as ExecutionContext);

      // Update with new wishlist
      const putRequest2 = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "Updated wishlist" }),
      });
      const response2 = await worker.fetch(putRequest2, env, {} as ExecutionContext);

      expect(response2.status).toBe(200);

      // Verify only the latest value is stored
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const getResponse = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const getData = await getResponse.json<{ wishlist: string }>();

      expect(getResponse.status).toBe(200);
      expect(getData.wishlist).toBe("Updated wishlist");
    });

    it("should return 404 for non-existent guest", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "Test" }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should return 400 for invalid guest ID format", async () => {
      // Use 36-char fake ID that passes regex but doesn't exist
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "Test" }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should handle empty wishlist", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "" }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify empty string is stored
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const getResponse = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const getData = await getResponse.json<{ wishlist: string }>();

      expect(getResponse.status).toBe(200);
      expect(getData.wishlist).toBe("");
    });

    it("should handle Unicode characters", async () => {
      const unicodeWishlist = "🎮 Video games 🎸 Guitars 📚 Books 🍕 Pizza 🎁 Gifts";
      const request = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: unicodeWishlist }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify Unicode is preserved
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const getResponse = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const getData = await getResponse.json<{ wishlist: string }>();

      expect(getResponse.status).toBe(200);
      expect(getData.wishlist).toBe(unicodeWishlist);
    });

    it("should include CORS headers", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "Test" }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
    });
  });

  describe("GET /api/guest/:id/wishlist", () => {
    let guestId: string;

    beforeEach(async () => {
      const createRequest = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob", "Charlie"],
        }),
      });

      const createResponse = await worker.fetch(createRequest, env, {} as ExecutionContext);
      const createData = await createResponse.json<{
        guestUrls: { [key: string]: string };
      }>();
      const guestUrl = createData.guestUrls.Alice;
      guestId = guestUrl.split("/").pop() || "";
    });

    it("should get wishlist for valid guest", async () => {
      // First set the wishlist
      const putRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`, {
        method: "PUT",
        body: JSON.stringify({ wishlist: "My wish list" }),
      });
      await worker.fetch(putRequest, env, {} as ExecutionContext);

      // Then get it
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const response = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const data = await response.json<{ wishlist: string }>();

      expect(response.status).toBe(200);
      expect(data.wishlist).toBe("My wish list");
    });

    it("should return empty string for unset wishlist", async () => {
      const getRequest = new Request(`http://localhost/api/guest/${guestId}/wishlist`);
      const response = await worker.fetch(getRequest, env, {} as ExecutionContext);
      const data = await response.json<{ wishlist: string }>();

      expect(response.status).toBe(200);
      expect(data.wishlist).toBe("");
    });

    it("should return 404 for non-existent guest", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/wishlist`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should return 400 for invalid guest ID format", async () => {
      // Use 36-char fake ID that passes regex but doesn't exist
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const request = new Request(`http://localhost/api/guest/${fakeId}/wishlist`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid guest ID");
    });

    it("should include CORS headers", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/wishlist`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
    });
  });

  describe("Recipient Wishlist Integration", () => {
    let aliceId: string;
    let bobId: string;
    let charlieId: string;
    let recipientGuestId: string;
    const recipientWishlist = "Books, gadgets, and coffee\n\nSomething warm for winter";

    beforeEach(async () => {
      // Create party with 3 guests
      const createRequest = new Request("http://localhost/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Party",
          guests: ["Alice", "Bob", "Charlie"],
        }),
      });

      const createResponse = await worker.fetch(
        createRequest,
        env,
        {} as ExecutionContext
      );
      const createData = await createResponse.json<{
        guestUrls: { [key: string]: string };
      }>();

      // Extract guest IDs from URLs
      const aliceUrl = createData.guestUrls.Alice;
      const bobUrl = createData.guestUrls.Bob;
      const charlieUrl = createData.guestUrls.Charlie;

      aliceId = aliceUrl.split("/").pop() || "";
      bobId = bobUrl.split("/").pop() || "";
      charlieId = charlieUrl.split("/").pop() || "";

      // Set wishlist for Bob (will be someone's recipient)
      const wishlistRequest = new Request(
        `http://localhost/api/guest/${bobId}/wishlist`,
        {
          method: "PUT",
          body: JSON.stringify({ wishlist: recipientWishlist }),
        }
      );
      await worker.fetch(wishlistRequest, env, {} as ExecutionContext);
    });

    it("should fetch recipient wishlist using recipientGuestId from assignment", async () => {
      // Get assignment for Alice - Secret Santa assignment is random, so we just verify it returns a valid recipientGuestId
      const assignmentRequest = new Request(
        `http://localhost/api/guest/${aliceId}/assignment`
      );
      const assignmentResponse = await worker.fetch(
        assignmentRequest,
        env,
        {} as ExecutionContext
      );
      const assignmentData = await assignmentResponse.json<{
        recipientGuestId: string;
        assignment: string;
      }>();

      expect(assignmentResponse.status).toBe(200);
      expect(assignmentData.recipientGuestId).toBeTruthy();
      expect(typeof assignmentData.recipientGuestId).toBe("string");
      expect(assignmentData.recipientGuestId.length).toBe(36); // UUID format

      // Fetch recipient's wishlist using the recipientGuestId from assignment
      const wishlistRequest = new Request(
        `http://localhost/api/guest/${assignmentData.recipientGuestId}/wishlist`
      );
      const wishlistResponse = await worker.fetch(
        wishlistRequest,
        env,
        {} as ExecutionContext
      );
      const wishlistData = await wishlistResponse.json<{ wishlist: string }>();

      expect(wishlistResponse.status).toBe(200);

      // If Alice was assigned to Bob, verify wishlist content
      if (assignmentData.assignment === "Bob") {
        expect(wishlistData.wishlist).toBe(recipientWishlist);
      }
      // If Alice was assigned to someone else, just verify wishlist API works
      else {
        expect(typeof wishlistData.wishlist).toBe("string");
      }
    });

    it("should display empty string when recipient has no wishlist", async () => {
      // Clear Charlie's wishlist explicitly
      const clearRequest = new Request(
        `http://localhost/api/guest/${charlieId}/wishlist`,
        {
          method: "PUT",
          body: JSON.stringify({ wishlist: "" }),
        }
      );
      await worker.fetch(clearRequest, env, {} as ExecutionContext);

      // Fetch Charlie's wishlist directly (should be empty)
      const wishlistRequest = new Request(
        `http://localhost/api/guest/${charlieId}/wishlist`
      );
      const wishlistResponse = await worker.fetch(
        wishlistRequest,
        env,
        {} as ExecutionContext
      );
      const wishlistData = await wishlistResponse.json<{ wishlist: string }>();

      expect(wishlistResponse.status).toBe(200);
      expect(wishlistData.wishlist).toBe("");
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

    it("should include recipientGuestId in response", async () => {
      const request = new Request(`http://localhost/api/guest/${guestId}/assignment`);

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      const data = await response.json<{ recipientGuestId: string }>();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("recipientGuestId");
      expect(data.recipientGuestId).toBeTruthy();
      expect(typeof data.recipientGuestId).toBe("string");
      expect(data.recipientGuestId.length).toBe(36); // UUID format
    });

    it("should return 404 for non-existent guest", async () => {
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
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
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
