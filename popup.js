const toggleSwitch = document.getElementById("toggleSwitch");
const countEl = document.getElementById("count");

// Toggle hiding — the content script reacts to this storage change directly.
toggleSwitch.addEventListener("change", () => {
  chrome.storage.sync.set({ isHiding: toggleSwitch.checked });
});

// Restore the saved toggle state.
chrome.storage.sync.get("isHiding", (storage) => {
  toggleSwitch.checked = !!storage.isHiding;
});

// Show the current hidden count and keep it live while the popup is open.
function renderCount(value) {
  countEl.textContent = value || 0;
}

chrome.storage.local.get("blockedCount", (storage) => {
  renderCount(storage.blockedCount);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedCount) {
    renderCount(changes.blockedCount.newValue);
  }
  if (area === "sync" && changes.whitelist) {
    renderWhitelist(changes.whitelist.newValue);
  }
});

// --- Whitelist ---
// Stored in chrome.storage.sync as an array of lowercased handles (no "@").
const HANDLE_RE = /^[a-z0-9_]{1,15}$/;
const form = document.getElementById("whitelistForm");
const input = document.getElementById("whitelistInput");
const errorEl = document.getElementById("whitelistError");
const listEl = document.getElementById("whitelistItems");
const listCountEl = document.getElementById("whitelistCount");

function getWhitelist(callback) {
  chrome.storage.sync.get("whitelist", (storage) => {
    callback(Array.isArray(storage.whitelist) ? storage.whitelist : []);
  });
}

function saveWhitelist(list) {
  chrome.storage.sync.set({ whitelist: list }, () => {
    if (chrome.runtime.lastError) {
      showError("Could not save: " + chrome.runtime.lastError.message);
    }
  });
}

function showError(message) {
  errorEl.textContent = message || "";
}

function renderWhitelist(list) {
  list = Array.isArray(list) ? list : [];
  listCountEl.textContent = list.length;
  listEl.replaceChildren();
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No users in the whitelist";
    listEl.appendChild(li);
    return;
  }
  for (const handle of list) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = "@" + handle;
    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "✕";
    remove.title = "Remove @" + handle;
    remove.addEventListener("click", () => {
      getWhitelist((current) => saveWhitelist(current.filter((h) => h !== handle)));
    });
    li.append(name, remove);
    listEl.appendChild(li);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const handle = input.value.trim().replace(/^@/, "").toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    showError("Invalid username (letters, numbers and _, max 15).");
    return;
  }
  getWhitelist((current) => {
    if (current.includes(handle)) {
      showError("@" + handle + " is already in the whitelist.");
      return;
    }
    showError("");
    input.value = "";
    saveWhitelist([...current, handle].sort());
  });
});

input.addEventListener("input", () => showError(""));

getWhitelist(renderWhitelist);
