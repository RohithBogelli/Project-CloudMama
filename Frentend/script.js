const API = "http://localhost:5000/api";
let allNotes = [];

const getToken = () => localStorage.getItem("cm_token");
const getUser  = () => JSON.parse(localStorage.getItem("cm_user") || "null");

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "msg " + type;
}

function switchTab(tab) {
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
  document.getElementById("loginForm").style.display    = tab === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = tab === "register" ? "block" : "none";
}

function switchTabDirect(tab) { switchTab(tab); }

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("noteFile");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const name = fileInput.files[0] ? fileInput.files[0].name : "Choose PDF file...";
      document.getElementById("fileName").textContent = name;
    });
  }
});

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Creating...";

  const body = {
    name:     document.getElementById("regName").value.trim(),
    email:    document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value,
    college:  document.getElementById("regCollege").value.trim()
  };

  try {
    const res  = await fetch(`${API}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("registerMsg", "✅ Account created! Switching to login...", "success");
      document.getElementById("registerForm").reset();
      setTimeout(() => switchTab("login"), 1500);
    } else {
      showMsg("registerMsg", "❌ " + data.message, "error");
    }
  } catch {
    showMsg("registerMsg", "❌ Cannot reach server. Is backend running?", "error");
  }
  btn.disabled = false;
  btn.querySelector("span").textContent = "Create Account";
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Logging in...";

  const body = {
    email:    document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value
  };

  try {
    const res  = await fetch(`${API}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("cm_token", data.token);
      localStorage.setItem("cm_user", JSON.stringify(data.user));
      showMsg("loginMsg", "✅ Login successful!", "success");
      setTimeout(() => showDashboard(data.user), 600);
    } else {
      showMsg("loginMsg", "❌ " + data.message, "error");
    }
  } catch {
    showMsg("loginMsg", "❌ Cannot reach server. Is backend running?", "error");
  }
  btn.disabled = false;
  btn.querySelector("span").textContent = "Login to CloudMama";
}

function logout() {
  localStorage.removeItem("cm_token");
  localStorage.removeItem("cm_user");
  document.getElementById("dashboard").style.display   = "none";
  document.getElementById("authSection").style.display = "grid";
  document.getElementById("logoutBtn").style.display   = "none";
  document.getElementById("navCollege").textContent    = "";
}

function showDashboard(user) {
  document.getElementById("authSection").style.display   = "none";
  document.getElementById("dashboard").style.display     = "block";
  document.getElementById("logoutBtn").style.display     = "inline-block";
  document.getElementById("userName").textContent        = user.name.split(" ")[0];
  document.getElementById("userCollege").textContent     = "📍 " + user.college;
  document.getElementById("navCollege").textContent      = user.college;
  document.getElementById("notesCollegeName").textContent = user.college;
  document.getElementById("userAvatar").textContent      = user.name.charAt(0).toUpperCase();
  loadNotes();
}

async function loadNotes() {
  const user  = getUser();
  const token = getToken();
  if (!user || !token) return;

  document.getElementById("notesGrid").innerHTML         = "";
  document.getElementById("emptyState").style.display    = "none";
  document.getElementById("loadingState").style.display  = "block";
  document.getElementById("notesCount").textContent      = "";
  document.getElementById("searchInput").value           = "";

  try {
    const res  = await fetch(`${API}/notes/college/${encodeURIComponent(user.college)}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    document.getElementById("loadingState").style.display = "none";

    if (!res.ok || data.length === 0) {
      document.getElementById("emptyState").style.display = "block";
      return;
    }

    allNotes = data;
    renderNotes(data);

  } catch {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("emptyState").style.display   = "block";
  }
}

function searchNotes() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allNotes.filter(note =>
    note.title.toLowerCase().includes(query) ||
    (note.subject && note.subject.toLowerCase().includes(query))
  );
  renderNotes(filtered);
}

function renderNotes(notes) {
  const grid = document.getElementById("notesGrid");
  grid.innerHTML = "";

  document.getElementById("emptyState").style.display = notes.length === 0 ? "block" : "none";
  document.getElementById("notesCount").textContent = notes.length + " note(s) found";

  notes.forEach((note, i) => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.style.animationDelay = (i * 0.06) + "s";
    card.innerHTML = `
      <span class="note-subject">${note.subject || "General"}</span>
      <div class="note-title">${note.title}</div>
      <div class="note-desc">${note.description || "No description."}</div>
      ${note.fileUrl ? `<a href="${note.fileUrl}" target="_blank" class="pdf-link">📄 Download PDF</a>` : ""}
      <div class="note-footer">
        <span>👤 ${note.uploadedBy || "Unknown"}</span>
        <button class="btn-delete" onclick="deleteNote('${note._id}')">🗑 Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function deleteNote(noteId) {
  if (!confirm("Are you sure you want to delete this note?")) return;
  const token = getToken();
  try {
    const res = await fetch(`${API}/notes/${noteId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    if (res.ok) {
      loadNotes();
    } else {
      alert("Failed to delete note!");
    }
  } catch {
    alert("Server error!");
  }
}

function toggleAddNote() {
  const card = document.getElementById("addNoteCard");
  card.style.display = card.style.display === "none" ? "block" : "none";
}

async function handleAddNote(e) {
  e.preventDefault();
  const token = getToken();
  const user  = getUser();

  const formData = new FormData();
  formData.append("title",       document.getElementById("noteTitle").value.trim());
  formData.append("subject",     document.getElementById("noteSubject").value.trim());
  formData.append("description", document.getElementById("noteDesc").value.trim());
  formData.append("college",     user.college);
  formData.append("uploadedBy",  user.name);

  const file = document.getElementById("noteFile").files[0];
  if (file) formData.append("file", file);

  try {
    const res  = await fetch(`${API}/notes/add`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("addNoteMsg", "✅ Note added successfully!", "success");
      document.getElementById("addNoteForm").reset();
      document.getElementById("fileName").textContent = "Choose PDF file...";
      setTimeout(() => { toggleAddNote(); loadNotes(); showMsg("addNoteMsg","",""); }, 1000);
    } else {
      showMsg("addNoteMsg", "❌ " + (data.message || data.error), "error");
    }
  } catch {
    showMsg("addNoteMsg", "❌ Server error. Try again.", "error");
  }
}

window.onload = () => {
  const token = getToken();
  const user  = getUser();
  if (token && user) showDashboard(user);
};