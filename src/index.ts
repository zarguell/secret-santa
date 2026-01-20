import { Party } from "./party";
import { CreatePartyRequest, AssignRequest, GuestMapping } from "./types";
import { storeGuestMappings, getGuestMapping } from "./kv";

export { Party };

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ============= CREATE PARTY ENDPOINT =============
      if (url.pathname === "/api/parties" && request.method === "POST") {
        const body = (await request.json()) as CreatePartyRequest;

        // Validation
        if (!body.name || !body.guests || body.guests.length < 2) {
          return new Response(
            JSON.stringify({
              error: "Party name and at least 2 guests required",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (body.guests.length > 50) {
          return new Response(
            JSON.stringify({ error: "Maximum 50 guests allowed" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Check for duplicate guest names
        const uniqueGuests = [...new Set(body.guests)];
        if (uniqueGuests.length !== body.guests.length) {
          return new Response(
            JSON.stringify({ error: "Guest names must be unique" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Create Durable Object for this party
        const partyId = env.PARTY_DO.newUniqueId();
        const partyStub = env.PARTY_DO.get(partyId);

        // Create party in Durable Object
        const result = await partyStub.createParty({
          name: body.name,
          budget: body.budget || "",
          criteria: body.criteria || "",
          guests: body.guests,
        });

        // Store guest ID mappings in KV for lookup
        await storeGuestMappings(
          env.GUEST_KV,
          result.guestMappings,
          result.partyId,
        );

        // Construct full URLs
        const baseUrl = url.origin;
        const guestUrls = Object.fromEntries(
          Object.entries(result.guestUrls).map(([guest, path]) => [
            guest,
            `${baseUrl}${path}`,
          ]),
        );

        return new Response(
          JSON.stringify({
            partyId: result.partyId,
            guestUrls,
            party: {
              id: result.partyId,
              name: body.name,
              budget: body.budget || "",
              criteria: body.criteria || "",
              guests: body.guests,
              createdAt: new Date().toISOString(),
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ============= GET GUEST ASSIGNMENT =============
      if (
        url.pathname.match(/^\/api\/guest\/[a-f0-9-]+\/assignment$/) &&
        request.method === "GET"
      ) {
        const guestId = url.pathname.split("/")[3];

        if (!guestId || guestId.length !== 36) {
          return new Response(JSON.stringify({ error: "Invalid guest ID" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const mapping = await getGuestMapping(env.GUEST_KV, guestId);

        if (!mapping) {
          return new Response(
            JSON.stringify({ error: "Guest link not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        try {
          const partyStub = env.PARTY_DO.get(
            env.PARTY_DO.idFromString(mapping.partyId),
          );
          const result = await partyStub.getGuestAssignment(guestId);

          // Get party data to look up recipient's guestId
          const partyData = await partyStub.getParty();
          const recipientGuestId = partyData.guestLinks[result.assignment];

          // Add recipientGuestId to response
          const responseWithRecipient = {
            ...result,
            recipientGuestId,
          };

          return new Response(JSON.stringify(responseWithRecipient), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ============= PUT GUEST WISHLIST =============
      if (
        url.pathname.match(/^\/api\/guest\/[a-f0-9-]+\/wishlist$/) &&
        request.method === "PUT"
      ) {
        const guestId = url.pathname.split("/")[3];

        if (!guestId || guestId.length !== 36) {
          return new Response(JSON.stringify({ error: "Invalid guest ID" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const mapping = await getGuestMapping(env.GUEST_KV, guestId);

        if (!mapping) {
          return new Response(
            JSON.stringify({ error: "Guest link not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        try {
          const body = (await request.json()) as { wishlist: string };
          const partyStub = env.PARTY_DO.get(
            env.PARTY_DO.idFromString(mapping.partyId),
          );
          await partyStub.setWishlist(guestId, body.wishlist);

          return new Response(
            JSON.stringify({ success: true }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ============= GET GUEST WISHLIST =============
      if (
        url.pathname.match(/^\/api\/guest\/[a-f0-9-]+\/wishlist$/) &&
        request.method === "GET"
      ) {
        const guestId = url.pathname.split("/")[3];

        if (!guestId || guestId.length !== 36) {
          return new Response(JSON.stringify({ error: "Invalid guest ID" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const mapping = await getGuestMapping(env.GUEST_KV, guestId);

        if (!mapping) {
          return new Response(
            JSON.stringify({ error: "Guest link not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        try {
          const partyStub = env.PARTY_DO.get(
            env.PARTY_DO.idFromString(mapping.partyId),
          );
          const wishlist = await partyStub.getWishlist(guestId);

          return new Response(
            JSON.stringify({ wishlist }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ============= SERVE GUEST PAGE =============
      if (
        url.pathname.match(/^\/guest\/[a-f0-9-]+$/) &&
        request.method === "GET"
      ) {
        const guestId = url.pathname.split("/")[2];

        // Validate guest exists
        const mapping = await getGuestMapping(env.GUEST_KV, guestId);

        if (!mapping) {
          return new Response("Guest link not found", {
            status: 404,
            headers: { "Content-Type": "text/html" },
          });
        }

        // Serve static guest.html from assets
        try {
          // Try to fetch from assets first
          if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
            const assetResponse = await env.ASSETS.fetch(
              new Request("http://localhost/guest.html")
            );
            return assetResponse;
          } else {
            // Fallback: read from filesystem during development/testing
            const guestHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🎁 Your Secret Santa Assignment</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body class="guest-page">
    <div class="snow"></div>
    <div class="snow"></div>
    <div class="snow"></div>

    <div class="container">
      <div id="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading your assignment...</p>
      </div>

      <div id="error" class="card error-card hidden">
        <span class="error-icon">😕</span>
        <h2>Oops!</h2>
        <p id="errorMessage"></p>
        <button onclick="window.location.reload()" class="btn-outline">
          Try Again
        </button>
      </div>

      <div id="assignment" class="hidden">
        <div class="card reveal-card">
          <div class="reveal-header">
            <span class="gift-emoji">🎁</span>
            <h1>Hello, <span id="guestName"></span>!</h1>
          </div>

          <div class="reveal-content">
            <p class="reveal-label">You're buying a gift for:</p>
            <div class="recipient-name" id="recipient"></div>
            <div class="confetti">🎊</div>
          </div>

          <div class="party-info">
            <h3>🎄 Party Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Party</span>
                <span class="info-value" id="partyName"></span>
              </div>
              <div class="info-item">
                <span class="info-label">Budget</span>
                <span class="info-value" id="budget"></span>
              </div>
              <div class="info-item full-width">
                <span class="info-label">Gift Ideas</span>
                <span class="info-value" id="criteria"></span>
              </div>
            </div>
          </div>

          <div class="wishlist-section">
            <h3>🎁 My Wishlist</h3>
            <textarea
              id="wishlistText"
              placeholder="What would you like for Christmas?"
              rows="4"
            ></textarea>
            <div class="wishlist-actions">
              <span id="charCounter" class="char-counter">0/500</span>
            </div>
            <button id="saveWishlistBtn" class="btn-primary">
              Save Wishlist
            </button>
            <div id="wishlistMessage" class="hint hidden"></div>
          </div>

          <div class="reminder">
            <span class="reminder-icon">🤫</span>
            <p>Remember: Keep it secret, keep it festive!</p>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <p>Made with ❤️ on Cloudflare Workers</p>
    </footer>

    <script src="/guest.js"></script>
  </body>
</html>`;
            return new Response(guestHtml, {
              status: 200,
              headers: { "Content-Type": "text/html" },
            });
          }
        } catch (error) {
          console.error("Failed to fetch asset:", error);
          return new Response("Failed to load guest page", {
            status: 500,
            headers: { "Content-Type": "text/html" },
          });
        }
      }

      // ============= VALIDATE GUEST ID FORMAT =============
      if (
        url.pathname.match(/^\/guest\//) &&
        request.method === "GET"
      ) {
        const guestId = url.pathname.split("/")[2];

        if (!guestId || guestId.length !== 36) {
          return new Response("Invalid guest link", {
            status: 400,
            headers: { "Content-Type": "text/html" },
          });
        }

        return new Response("Guest link not found", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      }

      // All other routes fall through (404)
      return new Response("Not found", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

// Environment bindings
export interface Env {
  PARTY_DO: DurableObjectNamespace<Party>;
  GUEST_KV: KVNamespace;
  ASSETS: Fetcher;
}
