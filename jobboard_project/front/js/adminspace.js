document.addEventListener("DOMContentLoaded", () => {
  const readUser = () => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to parse user from storage:", error);
      return null;
    }
  };

  const user = readUser();
  if (!user || user.role !== "Admin") {
    window.location.href = "login.html";
    return;
  }

  const adminId = user.person_id;

  const computeApiBase = () => {
    if (window.API_BASE_URL) return window.API_BASE_URL;
    const { protocol, hostname } = window.location;
    const safeProtocol = protocol.startsWith("http") ? protocol : "http:";
    const targetHost = hostname || "127.0.0.1";
    return `${safeProtocol}//${targetHost}:8000`;
  };

  const apiBase = computeApiBase();

  const handleResponse = async (res) => {
    if (res.ok) {
      if (res.status === 204) return null;
      return res.json();
    }
    let detail = "Request failed.";
    try {
      const data = await res.json();
      if (data?.detail) detail = Array.isArray(data.detail) ? data.detail.join(", ") : data.detail;
    } catch (_) {
      // ignore parsing error
    }
    throw new Error(detail);
  };

  const adminFetch = (path, options = {}) => {
    const headers = {
      "X-Admin-Id": String(adminId),
      ...(options.headers || {}),
    };
    return fetch(`${apiBase}${path}`, {
      ...options,
      headers,
    }).then(handleResponse);
  };

  const adminFetchJSON = (path) => adminFetch(path);

  const overviewUsersEl = document.getElementById("overview-users");
  const overviewCompaniesEl = document.getElementById("overview-companies");
  const overviewAdsEl = document.getElementById("overview-ads");
  const overviewApplicationsEl = document.getElementById("overview-applications");
  const usersTableBody = document.getElementById("admin-users-table");
  const companiesContainer = document.getElementById("admin-companies");
  const adsContainer = document.getElementById("admin-ads");
  const applicationsContainer = document.getElementById("admin-applications");
  const adminCreateForm = document.getElementById("admin-create-form");
  const adminCreateStatus = document.getElementById("admin-create-status");
  const userCreateForm = document.getElementById("admin-user-create-form");
  const companyCreateForm = document.getElementById("admin-company-create-form");
  const adCreateForm = document.getElementById("admin-ad-create-form");

  const usersListButton = document.getElementById("show-users");
  const companiesListButton = document.getElementById("show-companies");
  const adsListButton = document.getElementById("show-ads");
  const usersWrapper = document.getElementById("admin-users-wrapper");
  const companiesWrapper = document.getElementById("admin-companies");
  const adsWrapper = document.getElementById("admin-ads");

  const STATUS_VALUES = ["Sent", "In review", "Interview", "Rejected", "Hired"];
  let usersCache = [];
  let companiesCache = [];
  let adsCache = [];
  let applicationsCache = [];

  const toNumberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };

  const loadOverview = async () => {
    try {
      const data = await adminFetchJSON("/admin/overview");
      if (overviewUsersEl) overviewUsersEl.textContent = data.users ?? "-";
      if (overviewCompaniesEl) overviewCompaniesEl.textContent = data.companies ?? "-";
      if (overviewAdsEl) overviewAdsEl.textContent = data.advertisements ?? "-";
      if (overviewApplicationsEl) overviewApplicationsEl.textContent = data.applications ?? "-";
    } catch (error) {
      console.error("Unable to load overview:", error);
    }
  };

  const renderUserRow = (userData) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50";
    tr.innerHTML = `
      <td class="py-2 pr-4">${userData.first_name || ""} ${userData.last_name || ""}</td>
      <td class="py-2 pr-4">${userData.email || ""}</td>
      <td class="py-2 pr-4">${userData.role}</td>
      <td class="py-2 pr-4">${userData.phone || "—"}</td>
      <td class="py-2 pr-4">
        <div class="flex items-center gap-2">
          <button class="admin-edit-user text-sm text-blue-600 hover:text-blue-700" data-id="${userData.person_id}">
            Edit
          </button>
          <button class="admin-delete-user text-sm text-red-600 hover:text-red-700" data-id="${userData.person_id}">
            Delete
          </button>
        </div>
      </td>
    `;
    return tr;
  };

  const loadUsers = async () => {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = "";
    try {
      const users = await adminFetchJSON("/admin/users");
      usersCache = users;
      if (usersWrapper) usersWrapper.dataset.loaded = "true";
      users.forEach((u) => {
        usersTableBody.appendChild(renderUserRow(u));
      });
      usersTableBody.querySelectorAll(".admin-delete-user").forEach((btn) => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        if (!Number.isInteger(id) || id === adminId) {
          btn.setAttribute("disabled", "disabled");
          btn.classList.remove("text-red-600", "hover:text-red-700");
          btn.classList.add("text-gray-400", "cursor-not-allowed");
          return;
        }
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this user? This action is irreversible.")) return;
          try {
            await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
            await loadUsers();
            await loadOverview();
          } catch (error) {
            alert(error.message);
          }
        });
      });
      usersTableBody.querySelectorAll(".admin-edit-user").forEach((btn) => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        if (!Number.isInteger(id)) return;
        const userData = usersCache.find((u) => u.person_id === id);
        if (!userData) return;
        btn.addEventListener("click", async () => {
          await openUserEditDialog(userData);
        });
      });
    } catch (error) {
      console.error("Unable to load users:", error);
      usersTableBody.innerHTML = `<tr><td colspan="5" class="py-3 text-red-600">Unable to load users.</td></tr>`;
    }
  };

  const openUserEditDialog = async (userData) => {
    const firstName = prompt("First name", userData.first_name || "");
    if (firstName === null) return;
    const lastName = prompt("Last name", userData.last_name || "");
    if (lastName === null) return;
    const email = prompt("Email", userData.email || "");
    if (email === null) return;
    const phone = prompt("Phone", userData.phone || "");
    if (phone === null) return;
    const role = prompt("Role (Applicant/Recruiter/Admin)", userData.role || "Applicant");
    if (role === null) return;
    if (!["Applicant", "Recruiter", "Admin"].includes(role)) {
      alert("Invalid role");
      return;
    }
    const companyIdInput = prompt("Company ID (leave blank if none)", userData.company_id || "");
    if (companyIdInput === null) return;
    const passwordInput = prompt("New password (leave blank to keep current)", "");
    if (passwordInput === null) return;

    const companyIdValue = toNumberOrNull(companyIdInput.trim());
    if (companyIdInput.trim() && companyIdValue === null) {
      alert("Company ID must be a number");
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      role: role,
      company_id: companyIdValue,
    };

    if (passwordInput.trim()) {
      payload.password = passwordInput.trim();
    }

    try {
      await adminFetch(`/admin/users/${userData.person_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadUsers();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  };

  const renderCompanyCard = (company) => {
    const div = document.createElement("div");
    div.className = "border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-2";
    div.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold text-[#0b1e35]">${company.name}</h3>
        <p class="text-sm text-gray-500">${company.industry || "Industry not specified"}</p>
      </div>
      <p class="text-sm text-gray-600"><strong>Size:</strong> ${company.size || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Email:</strong> ${company.email || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Phone:</strong> ${company.phone || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Website:</strong> ${company.website || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Address:</strong> ${company.address || "—"}</p>
      <div class="flex gap-2 mt-2">
        <button class="admin-edit-company rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600" data-id="${company.company_id}">
          Edit
        </button>
        <button class="admin-delete-company rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600" data-id="${company.company_id}">
          Delete
        </button>
      </div>
    `;
    return div;
  };

  const loadCompanies = async () => {
    if (!companiesContainer) return;
    companiesContainer.innerHTML = "";
    try {
      const companies = await fetch(`${apiBase}/companies`).then(handleResponse);
      companiesCache = Array.isArray(companies) ? companies : [];
      if (companiesWrapper) companiesWrapper.dataset.loaded = "true";
      if (!Array.isArray(companies) || !companies.length) {
        companiesContainer.innerHTML = "<p class='text-gray-500'>No companies registered yet.</p>";
        return;
      }
      companies.forEach((company) => {
        companiesContainer.appendChild(renderCompanyCard(company));
      });
      companiesContainer.querySelectorAll(".admin-delete-company").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id || !confirm("Delete this company and all related data?")) return;
          try {
            await adminFetch(`/admin/companies/${id}`, { method: "DELETE" });
            await loadCompanies();
            await loadOverview();
          } catch (error) {
            alert(error.message);
          }
        });
      });
      companiesContainer.querySelectorAll(".admin-edit-company").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));
          const company = companiesCache.find((c) => c.company_id === id);
          if (!company) return;
          await openCompanyEditDialog(company);
        });
      });
    } catch (error) {
      console.error("Unable to load companies:", error);
      companiesContainer.innerHTML = "<p class='text-red-600'>Unable to load companies.</p>";
    }
  };

  const openCompanyEditDialog = async (company) => {
    const name = prompt("Company name", company.name || "");
    if (name === null) return;
    const industry = prompt("Industry", company.industry || "");
    if (industry === null) return;
    const size = prompt("Size (Startup/PME/Grande entreprise)", company.size || "");
    if (size === null) return;
    const website = prompt("Website", company.website || "");
    if (website === null) return;
    const email = prompt("Email", company.email || "");
    if (email === null) return;
    const phone = prompt("Phone", company.phone || "");
    if (phone === null) return;
    const address = prompt("Address", company.address || "");
    if (address === null) return;

    const payload = {
      name: name.trim(),
      industry: industry.trim() || null,
      size: size.trim() || null,
      website: website.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    };

    try {
      await adminFetch(`/admin/companies/${company.company_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadCompanies();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  };

  const renderAdCard = (ad) => {
    const div = document.createElement("div");
    div.className = "border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-2";
    div.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold text-[#0b1e35]">${ad.title}</h3>
        <p class="text-sm text-gray-500">${ad.location || "Location not specified"}</p>
      </div>
      <p class="text-sm text-gray-600"><strong>Company ID:</strong> ${ad.company_id}</p>
      <p class="text-sm text-gray-600"><strong>Contract:</strong> ${ad.contract_type || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Salary:</strong> ${ad.salary_min ?? "—"} - ${ad.salary_max ?? "—"}</p>
      <p class="text-sm text-gray-600"><strong>Expires:</strong> ${ad.date_expiry || "—"}</p>
      <p class="text-sm text-gray-600"><strong>Description:</strong> ${ad.description || "—"}</p>
      <div class="flex gap-2 mt-2">
        <button class="admin-edit-ad rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600" data-id="${ad.ad_id}">
          Edit
        </button>
        <button class="admin-delete-ad rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600" data-id="${ad.ad_id}">
          Delete
        </button>
      </div>
    `;
    return div;
  };

  const loadAds = async () => {
    if (!adsContainer) return;
    adsContainer.innerHTML = "";
    try {
      const ads = await fetch(`${apiBase}/advertisements`).then(handleResponse);
      adsCache = Array.isArray(ads) ? ads : [];
      if (adsWrapper) adsWrapper.dataset.loaded = "true";
      if (!Array.isArray(ads) || !ads.length) {
        adsContainer.innerHTML = "<p class='text-gray-500'>No advertisements posted yet.</p>";
        return;
      }
      ads.forEach((ad) => {
        adsContainer.appendChild(renderAdCard(ad));
      });
      adsContainer.querySelectorAll(".admin-delete-ad").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id || !confirm("Delete this advertisement?")) return;
          try {
            await adminFetch(`/admin/advertisements/${id}`, { method: "DELETE" });
            await loadAds();
            await loadOverview();
          } catch (error) {
            alert(error.message);
          }
        });
      });
      adsContainer.querySelectorAll(".admin-edit-ad").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));
          const advert = adsCache.find((a) => a.ad_id === id);
          if (!advert) return;
          await openAdEditDialog(advert);
        });
      });
    } catch (error) {
      console.error("Unable to load advertisements:", error);
      adsContainer.innerHTML = "<p class='text-red-600'>Unable to load advertisements.</p>";
    }
  };

  const openAdEditDialog = async (ad) => {
    const companyIdInput = prompt("Company ID", ad.company_id ?? "");
    if (companyIdInput === null) return;
    const companyId = toNumberOrNull(companyIdInput.trim());
    if (companyIdInput.trim() && companyId === null) {
      alert("Company ID must be a number");
      return;
    }
    const title = prompt("Title", ad.title || "");
    if (title === null) return;
    const description = prompt("Description", ad.description || "");
    if (description === null) return;
    const location = prompt("Location", ad.location || "");
    if (location === null) return;
    const contractType = prompt("Contract type", ad.contract_type || "");
    if (contractType === null) return;
    const salaryMinInput = prompt("Salary min", ad.salary_min ?? "");
    if (salaryMinInput === null) return;
    const salaryMaxInput = prompt("Salary max", ad.salary_max ?? "");
    if (salaryMaxInput === null) return;
    const expiry = prompt("Expiry date (YYYY-MM-DD)", ad.date_expiry || "");
    if (expiry === null) return;

    const salaryMin = toNumberOrNull(salaryMinInput.trim());
    if (salaryMinInput.trim() && salaryMin === null) {
      alert("Salary min must be a number");
      return;
    }
    const salaryMax = toNumberOrNull(salaryMaxInput.trim());
    if (salaryMaxInput.trim() && salaryMax === null) {
      alert("Salary max must be a number");
      return;
    }

    const payload = {
      company_id: companyId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || null,
      contract_type: contractType.trim() || null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      date_expiry: expiry.trim() || null,
    };

    try {
      await adminFetch(`/admin/advertisements/${ad.ad_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadAds();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  };

  const formatMultiline = (text) => {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>");
  };

  const renderApplicationCard = (app) => {
    const div = document.createElement("div");
    div.className = "border border-gray-200 rounded-lg p-4 shadow-sm";
    div.innerHTML = `
      <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
        <div>
          <h3 class="text-lg font-semibold text-[#0b1e35]">${app.title}</h3>
          <p class="text-sm text-gray-500">${app.company_name}</p>
          <p class="text-sm text-gray-500">Applied on ${new Date(app.application_date).toLocaleDateString()}</p>
          <p class="text-sm text-gray-600 mt-2"><strong>Candidate:</strong> ${app.first_name} ${app.last_name}</p>
          <p class="text-sm text-gray-600"><strong>Email:</strong> ${app.email}</p>
          <p class="text-sm text-gray-600"><strong>Phone:</strong> ${app.phone || "—"}</p>
        </div>
        <div class="text-sm">
          <label class="font-medium text-[#0b1e35]" for="status-${app.application_id}">Status</label>
          <select id="status-${app.application_id}" data-id="${app.application_id}" class="admin-application-status mt-1 rounded-md border border-gray-300 px-2 py-1 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
            ${STATUS_VALUES.map((status) => `<option value="${status}" ${status === app.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </div>
      </div>
      ${app.message ? `<div class="mt-3 text-sm text-[#0b1e35]"><strong>Message:</strong><br><span class="block mt-1">${formatMultiline(app.message)}</span></div>` : ""}
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="admin-save-application rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600" data-id="${app.application_id}">
          Save status
        </button>
        <button class="admin-delete-application rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600" data-id="${app.application_id}">
          Delete application
        </button>
      </div>
    `;
    return div;
  };

  const loadApplications = async () => {
    if (!applicationsContainer) return;
    applicationsContainer.innerHTML = "";
    try {
      const applications = await adminFetchJSON("/admin/applications");
      applicationsCache = Array.isArray(applications) ? applications : [];
      if (!Array.isArray(applications) || !applications.length) {
        applicationsContainer.innerHTML = "<p class='text-gray-500'>No applications submitted yet.</p>";
        return;
      }
      applications.forEach((app) => {
        applicationsContainer.appendChild(renderApplicationCard(app));
      });
      applicationsContainer.querySelectorAll(".admin-save-application").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-id"));
          if (!Number.isInteger(id)) return;
          const select = document.querySelector(`select.admin-application-status[data-id="${id}"]`);
          const newStatus = select?.value;
          if (!newStatus) return;
          try {
            await adminFetch(`/admin/applications/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            });
            await loadApplications();
            await loadOverview();
          } catch (error) {
            alert(error.message);
          }
        });
      });
      applicationsContainer.querySelectorAll(".admin-delete-application").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id || !confirm("Delete this application?")) return;
          try {
            await adminFetch(`/admin/applications/${id}`, { method: "DELETE" });
            await loadApplications();
            await loadOverview();
          } catch (error) {
            alert(error.message);
          }
        });
      });
    } catch (error) {
      console.error("Unable to load applications:", error);
      applicationsContainer.innerHTML = "<p class='text-red-600'>Unable to load applications.</p>";
    }
  };

  adminCreateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      email: document.getElementById("admin-email")?.value.trim(),
      password: document.getElementById("admin-password")?.value,
    };

    if (!payload.email || !payload.password) {
      alert("Please fill in email and password.");
      return;
    }

    try {
      await adminFetch("/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (adminCreateStatus) {
        adminCreateStatus.textContent = "Admin created";
        adminCreateStatus.classList.remove("hidden");
        setTimeout(() => adminCreateStatus.classList.add("hidden"), 2500);
      }
      adminCreateForm.reset();
      await loadUsers();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  });

  userCreateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      first_name: document.getElementById("user-first-name")?.value.trim(),
      last_name: document.getElementById("user-last-name")?.value.trim(),
      email: document.getElementById("user-email")?.value.trim(),
      role: document.getElementById("user-role")?.value,
      phone: document.getElementById("user-phone")?.value.trim() || null,
      password: document.getElementById("user-password")?.value || undefined,
      company_id: toNumberOrNull(document.getElementById("user-company-id")?.value),
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.role) {
      alert("Please fill in first name, last name, email, and role.");
      return;
    }

    if (payload.company_id === null && document.getElementById("user-company-id")?.value.trim()) {
      alert("Company ID must be a number.");
      return;
    }

    try {
      await adminFetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      userCreateForm.reset();
      await loadUsers();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  });

  companyCreateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("company-name")?.value.trim(),
      industry: document.getElementById("company-industry")?.value.trim() || null,
      size: document.getElementById("company-size")?.value || null,
      website: document.getElementById("company-website")?.value.trim() || null,
      email: document.getElementById("company-email")?.value.trim() || null,
      phone: document.getElementById("company-phone")?.value.trim() || null,
      address: document.getElementById("company-address")?.value.trim() || null,
    };

    if (!payload.name) {
      alert("Company name is required.");
      return;
    }

    try {
      await adminFetch("/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      companyCreateForm.reset();
      await loadCompanies();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  });

  adCreateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      company_id: toNumberOrNull(document.getElementById("ad-company-id")?.value),
      title: document.getElementById("ad-title-input")?.value.trim(),
      description: document.getElementById("ad-description-input")?.value.trim(),
      location: document.getElementById("ad-location-input")?.value.trim() || null,
      contract_type: document.getElementById("ad-contract-input")?.value || null,
      salary_min: toNumberOrNull(document.getElementById("ad-salary-min-input")?.value),
      salary_max: toNumberOrNull(document.getElementById("ad-salary-max-input")?.value),
      date_expiry: document.getElementById("ad-expiry-input")?.value || null,
    };

    if (payload.company_id === null) {
      alert("Company ID is required.");
      return;
    }
    if (!payload.title || !payload.description) {
      alert("Title and description are required.");
      return;
    }

    try {
      await adminFetch("/admin/advertisements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      adCreateForm.reset();
      await loadAds();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("refresh-users")?.addEventListener("click", loadUsers);
  document.getElementById("refresh-companies")?.addEventListener("click", loadCompanies);
  document.getElementById("refresh-ads")?.addEventListener("click", loadAds);
  document.getElementById("refresh-applications-admin")?.addEventListener("click", loadApplications);

  const setupToggleButton = (button, container, loadFn) => {
    if (!button || !container) return;
    const updateLabel = () => {
      button.textContent = container.classList.contains("hidden") ? "Show list" : "Hide";
    };
    updateLabel();
    button.addEventListener("click", async () => {
      if (container.classList.contains("hidden")) {
        if (!container.dataset.loaded) {
          await loadFn();
        }
        container.classList.remove("hidden");
        container.dataset.loaded = "true";
      } else {
        container.classList.add("hidden");
      }
      updateLabel();
    });
  };

  setupToggleButton(usersListButton, usersWrapper, loadUsers);
  setupToggleButton(companiesListButton, companiesWrapper, loadCompanies);
  setupToggleButton(adsListButton, adsWrapper, loadAds);

  loadOverview();
  loadUsers();
  loadCompanies();
  loadAds();
  loadApplications();
});
