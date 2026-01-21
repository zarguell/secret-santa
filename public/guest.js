const guestId = window.location.pathname.split("/")[2];
const API_BASE = window.location.origin;

async function loadAssignment() {
  try {
    const response = await fetch(`${API_BASE}/api/guest/${guestId}/assignment`);

    if (response.status === 404) {
      showError("Invalid guest link. Please check the URL and try again.");
      return;
    }

    if (response.status === 429) {
      showError("Too many requests. Please wait a minute and refresh.");
      return;
    }

    if (!response.ok) {
      showError("Failed to load assignment. Please refresh the page.");
      return;
    }

    const data = await response.json();
    displayAssignment(data);
  } catch (error) {
    console.error("Error loading assignment:", error);
    showError("Network error. Please check your connection and try again.");
  }
}

async function loadWishlist() {
  try {
    const response = await fetch(
      `${API_BASE}/api/guest/${guestId}/wishlist`
    );

    if (response.status === 404) {
      console.warn("Wishlist not found (guest may not be in party)");
      return;
    }

    if (response.status === 429) {
      console.warn("Too many requests loading wishlist");
      return;
    }

    if (!response.ok) {
      console.error("Failed to load wishlist");
      return;
    }

    const data = await response.json();
    document.getElementById("wishlistText").value = data.wishlist;
    updateCounter();
  } catch (error) {
    console.error("Error loading wishlist:", error);
  }
}

async function saveWishlist() {
  const textarea = document.getElementById("wishlistText");
  const messageDiv = document.getElementById("wishlistMessage");
  const saveBtn = document.getElementById("saveWishlistBtn");

  const text = textarea.value;

  // Client-side validation
  if (text.length > 500) {
    messageDiv.textContent = "Wishlist must be 500 characters or less";
    messageDiv.style.color = "var(--color-error)";
    messageDiv.classList.remove("hidden");
    return;
  }

  // Show loading state
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  messageDiv.classList.add("hidden");

  try {
    const response = await fetch(
      `${API_BASE}/api/guest/${guestId}/wishlist`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wishlist: text }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Success - show message for 3 seconds
    messageDiv.textContent = "Wishlist saved!";
    messageDiv.style.color = "var(--color-success)";
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 3000);
  } catch (error) {
    console.error("Error saving wishlist:", error);
    messageDiv.textContent = "Failed to save. Please try again.";
    messageDiv.style.color = "var(--color-error)";
    messageDiv.classList.remove("hidden");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Wishlist";
  }
}

async function loadRecipientWishlist(recipientGuestId) {
  try {
    const response = await fetch(
      `${API_BASE}/api/guest/${recipientGuestId}/wishlist`
    );

    if (response.status === 404) {
      document.getElementById("recipient-wishlist-text").textContent =
        "No wishlist set";
      return;
    }

    if (response.status === 429) {
      document.getElementById("recipient-wishlist-text").textContent =
        "Too many requests";
      return;
    }

    if (!response.ok) {
      console.error("Failed to load recipient wishlist");
      document.getElementById("recipient-wishlist-text").textContent =
        "Could not load wishlist";
      return;
    }

    const data = await response.json();

    if (data.wishlist === "") {
      document.getElementById("recipient-wishlist-text").textContent =
        "No wishlist set";
    } else {
      document.getElementById("recipient-wishlist-text").textContent = data.wishlist;
    }
  } catch (error) {
    console.error("Error loading recipient wishlist:", error);
    document.getElementById("recipient-wishlist-text").textContent =
      "Could not load wishlist";
  }
}

function updateCounter() {
  const textarea = document.getElementById("wishlistText");
  const counter = document.getElementById("charCounter");
  const length = textarea.value.length;

  counter.textContent = `${length}/500`;

  // Color warning when approaching limit
  if (length > 450) {
    counter.style.color = "var(--color-error)";
  } else {
    counter.style.color = "var(--color-text-light)";
  }
}

function displayAssignment(data) {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("assignment").classList.remove("hidden");

  document.getElementById("guestName").textContent = data.guestName;
  document.getElementById("recipient").textContent = data.assignment;
  document.getElementById("partyName").textContent = data.party.name;
  document.getElementById("budget").textContent =
    data.party.budget || "Not specified";
  document.getElementById("criteria").textContent =
    data.party.criteria || "Surprise them!";

  // Load wishlist after displaying assignment
  loadWishlist();

  // Load recipient's wishlist if available
  if (data.recipientGuestId) {
    document.getElementById("recipient-wishlist-section").classList.remove("hidden");
    loadRecipientWishlist(data.recipientGuestId);
  }
}

function showError(message) {
  document.getElementById("loading").classList.add("hidden");
  const errorDiv = document.getElementById("error");
  document.getElementById("errorMessage").textContent = message;
  errorDiv.classList.remove("hidden");
}

// Event listeners for wishlist (wait for DOM to be ready)
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("wishlistText")?.addEventListener("input", updateCounter);
  document.getElementById("saveWishlistBtn")?.addEventListener("click", saveWishlist);
});

// Load assignment on page load
document.addEventListener("DOMContentLoaded", function () {
  loadAssignment();
});
