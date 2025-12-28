const API_BASE = window.location.origin;

document.getElementById("partyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = "<span>Creating...</span>";
  submitBtn.disabled = true;

  const formData = {
    name: document.getElementById("partyName").value.trim(),
    budget: document.getElementById("budget").value.trim(),
    criteria: document.getElementById("criteria").value.trim(),
    guests: document
      .getElementById("guests")
      .value.split("\n")
      .map((g) => g.trim())
      .filter((g) => g.length > 0),
  };

  // Validation
  if (formData.guests.length < 2) {
    alert("Please add at least 2 participants");
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    return;
  }

  if (formData.guests.length > 50) {
    alert("Maximum 50 participants allowed");
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    return;
  }

  if (new Set(formData.guests).size !== formData.guests.length) {
    alert("Participant names must be unique. Please check for duplicates.");
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/parties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.status === 429) {
      alert("Too many requests. Please wait a minute and try again.");
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || "Failed to create party"}`);
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    const result = await response.json();
    displayGuestLinks(result.guestUrls);

    // Hide form, show results
    document.querySelector(".card:first-of-type").style.display = "none";
  } catch (error) {
    console.error("Error creating party:", error);
    alert(
      "Failed to create party. Please check your connection and try again.",
    );
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  }
});

function displayGuestLinks(guestUrls) {
  const resultDiv = document.getElementById("result");
  const linksDiv = document.getElementById("guestLinks");

  linksDiv.innerHTML = "";

  Object.entries(guestUrls).forEach(([guest, url]) => {
    const linkDiv = document.createElement("div");
    linkDiv.className = "guest-link";
    linkDiv.innerHTML = `
      <strong>👤 ${escapeHtml(guest)}</strong>
      <input type="text" value="${escapeHtml(url)}" readonly onclick="this.select()">
      <button onclick="copyText('${escapeHtml(url)}', this)">📋 Copy</button>
    `;
    linksDiv.appendChild(linkDiv);
  });

  resultDiv.classList.remove("hidden");
  resultDiv.classList.add("show");
  resultDiv.scrollIntoView({ behavior: "smooth" });
}

function copyText(text, button) {
  const originalText = button.innerHTML;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      button.innerHTML = "✅ Copied!";
      button.style.background = "#28a745";

      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = "";
      }, 2000);
    })
    .catch(() => {
      alert("Failed to copy. Please copy manually.");
    });
}

function copyAllLinks() {
  const links = Array.from(document.querySelectorAll("#guestLinks input"))
    .map((input) => input.value)
    .join("\n");

  navigator.clipboard
    .writeText(links)
    .then(() => {
      const btn = event.target;
      const originalText = btn.innerHTML;
      btn.innerHTML = "✅ All Links Copied!";
      btn.style.background = "#28a745";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = "";
      }, 2000);
    })
    .catch(() => {
      alert("Failed to copy. Please copy manually.");
    });
}

function resetForm() {
  document.getElementById("partyForm").reset();
  document.querySelector(".card:first-of-type").style.display = "block";
  document.getElementById("result").classList.remove("show");
  document.getElementById("result").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
