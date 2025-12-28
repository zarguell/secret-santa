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
}

function showError(message) {
  document.getElementById("loading").classList.add("hidden");
  const errorDiv = document.getElementById("error");
  document.getElementById("errorMessage").textContent = message;
  errorDiv.classList.remove("hidden");
}

// Load assignment on page load
loadAssignment();
