document.addEventListener("DOMContentLoaded", () => {
  const apiBase = window.API_BASE_URL || `http://${window.location.hostname || "127.0.0.1"}:8000`;
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to parse user from storage:", error);
      return null;
    }
  })();

  const profileForm = document.getElementById("profile-form");
  const profileStatus = document.getElementById("profile-status");
  const applicationsEmpty = document.getElementById("applications-empty");
  const applicationsList = document.getElementById("applications-list");
  const refreshButton = document.getElementById("refresh-applications");

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatMultiline = (text) => {
    if (!text) return "";
    return escapeHtml(text).replace(/\r?\n/g, "<br>");
  };

  if (!user || user.role !== "Applicant") {
    if (applicationsList) {
      applicationsList.innerHTML = `
        <li class="text-red-600">
          You must be logged in as a candidate to access this page.
          <a href="login.html" class="text-orange-600 underline ml-1">Log in</a>
        </li>`;
    }
    if (profileForm) {
      profileForm.querySelectorAll("input, textarea, button").forEach((el) => el.disabled = true);
    }
    return;
  }

  const fields = {
    first_name: document.getElementById("profile-firstname"),
    last_name: document.getElementById("profile-lastname"),
    email: document.getElementById("profile-email"),
    phone: document.getElementById("profile-phone"),
    location: document.getElementById("profile-location"),
    about: document.getElementById("profile-about"),
  };

  if (fields.first_name && user.first_name) {
    fields.first_name.value = user.first_name;
  }
  if (fields.last_name && user.last_name) {
    fields.last_name.value = user.last_name;
  }
  if (fields.email && user.email) {
    fields.email.value = user.email;
  }
  if (fields.phone && user.phone) {
    fields.phone.value = user.phone;
  }

  const loadProfile = async () => {
    try {
      const res = await fetch(`${apiBase}/candidates/${user.person_id}`);
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      const candidate = data.candidate || data || {};
      const profile = data.profile && data.profile !== "No profile found for this candidate" ? data.profile : {};

      if (fields.first_name) fields.first_name.value = candidate.first_name || fields.first_name.value || "";
      if (fields.last_name) fields.last_name.value = candidate.last_name || fields.last_name.value || "";
      if (fields.email) fields.email.value = candidate.email || fields.email.value || "";
      if (fields.phone) fields.phone.value = candidate.phone || fields.phone.value || "";
      if (fields.location) fields.location.value = profile.location || "";
      if (fields.about) fields.about.value = profile.about || "";
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const payload = {
      first_name: fields.first_name?.value.trim() || "",
      last_name: fields.last_name?.value.trim() || "",
      email: fields.email?.value.trim() || "",
      phone: fields.phone?.value.trim() || "",
      location: fields.location?.value.trim() || "",
      about: fields.about?.value.trim() || "",
    };

    try {
      const res = await fetch(`${apiBase}/candidates/${user.person_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const updatedUser = {
        ...user,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (profileStatus) {
        profileStatus.classList.remove("hidden");
        setTimeout(() => profileStatus.classList.add("hidden"), 2500);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Unable to save your profile right now.");
    }
  };

  const renderApplications = (apps) => {
    applicationsList.innerHTML = "";
    apps.forEach((app) => {
      const li = document.createElement("li");
      li.className = "bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition";
      li.innerHTML = `
        <div class="flex flex-col gap-1">
          <h3 class="text-lg font-semibold text-[#0b1e35]">${app.job_title || app.title || "Untitled position"}</h3>
          <span class="text-sm text-gray-500">Applied on ${new Date(app.application_date).toLocaleDateString()}</span>
          <span class="text-sm"><strong>Status:</strong> ${app.status}</span>
          ${app.message ? `<span class="text-sm mt-1"><strong>Your message:</strong><br><span class="block mt-1 whitespace-pre-line">${formatMultiline(app.message)}</span></span>` : ""}
        </div>
        <button data-id="${app.application_id}" class="mt-3 self-start rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600">Delete</button>
      `;
      applicationsList.appendChild(li);
    });

    applicationsList.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const id = event.currentTarget.getAttribute("data-id");
        if (!id || !confirm("Are you sure you want to delete this application?")) return;
        try {
          const res = await fetch(`${apiBase}/applications/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          await loadApplications();
        } catch (error) {
          console.error("Error deleting application:", error);
          alert("Unable to delete the application.");
        }
      });
    });
  };

  const loadApplications = async () => {
    applicationsList.innerHTML = "";
    applicationsEmpty?.classList.add("hidden");
    try {
      const res = await fetch(`${apiBase}/applications/applicant/${user.person_id}`);
      if (!res.ok) throw new Error();
      const applications = await res.json();
      if (!Array.isArray(applications) || !applications.length) {
        applicationsEmpty?.classList.remove("hidden");
        return;
      }
      renderApplications(applications);
    } catch (error) {
      console.error("Error loading applications:", error);
      applicationsEmpty?.classList.remove("hidden");
      if (applicationsEmpty) {
        applicationsEmpty.textContent = "Unable to load your applications.";
      }
    }
  };

  profileForm?.addEventListener("submit", saveProfile);
  refreshButton?.addEventListener("click", loadApplications);

  loadProfile();
  loadApplications();
});
