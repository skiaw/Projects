document.addEventListener("DOMContentLoaded", () => {
  const computeApiBase = () => {
    if (window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    const { protocol, hostname } = window.location;
    const safeProtocol = protocol.startsWith("http") ? protocol : "http:";
    const targetHost = hostname || "127.0.0.1";
    return `${safeProtocol}//${targetHost}:8000`;
  };

  const apiBase = computeApiBase();
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to parse user from localStorage:", error);
      return null;
    }
  })();

  if (!storedUser || storedUser.role !== "Recruiter" || !storedUser.company_id) {
    window.location.href = "login.html";
    return;
  }

  const companyId = storedUser.company_id;

  const companyForm = document.getElementById("company-form");
  const companyStatus = document.getElementById("company-status");
  const companyFields = {
    name: document.getElementById("company-name"),
    industry: document.getElementById("company-industry"),
    size: document.getElementById("company-size"),
    website: document.getElementById("company-website"),
    email: document.getElementById("company-email"),
    phone: document.getElementById("company-phone"),
    address: document.getElementById("company-address"),
  };

  const toggleAdFormBtn = document.getElementById("toggle-ad-form");
  const adForm = document.getElementById("ad-form");
  const cancelAdBtn = document.getElementById("cancel-ad");
  const adFields = {
    adId: document.getElementById("ad-id"),
    title: document.getElementById("ad-title"),
    location: document.getElementById("ad-location"),
    contractType: document.getElementById("ad-contract"),
    salaryMin: document.getElementById("ad-salary-min"),
    salaryMax: document.getElementById("ad-salary-max"),
    expiry: document.getElementById("ad-expiry"),
    description: document.getElementById("ad-description"),
  };
  const adsList = document.getElementById("ads-list");
  const adsEmpty = document.getElementById("ads-empty");

  const showTemporaryStatus = (el) => {
    if (!el) return;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2000);
  };

  const parseNumber = (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const resetAdForm = () => {
    adFields.adId.value = "";
    adFields.title.value = "";
    adFields.location.value = "";
    adFields.contractType.value = "";
    adFields.salaryMin.value = "";
    adFields.salaryMax.value = "";
    adFields.expiry.value = "";
    adFields.description.value = "";
    adForm.classList.add("hidden");
  };

  const toggleAdFormVisibility = (forceShow = false) => {
    if (forceShow) {
      adForm.classList.remove("hidden");
      return;
    }
    adForm.classList.toggle("hidden");
  };

  const fetchCompany = async () => {
    try {
      const res = await fetch(`${apiBase}/companies/${companyId}`);
      if (!res.ok) throw new Error("Unable to fetch company information.");
      const company = await res.json();
      Object.entries(companyFields).forEach(([key, input]) => {
        if (!input) return;
        input.value = company[key] ? company[key] : "";
      });
    } catch (error) {
      console.error(error);
      alert("Failed to load company information.");
    }
  };

  const fetchAds = async () => {
    try {
      const res = await fetch(`${apiBase}/companies/${companyId}/advertisements`);
      if (!res.ok) throw new Error("Unable to fetch advertisements.");
      const ads = await res.json();
      renderAds(Array.isArray(ads) ? ads : []);
    } catch (error) {
      console.error(error);
      alert("Failed to load job postings.");
    }
  };

  const renderAds = (ads) => {
    adsList.innerHTML = "";
    if (!ads.length) {
      adsEmpty.classList.remove("hidden");
      return;
    }
    adsEmpty.classList.add("hidden");
    ads.forEach((ad) => {
      adsList.appendChild(createAdCard(ad));
    });
  };

  const createAdCard = (ad) => {
    const li = document.createElement("li");
    li.className = "bg-white border border-gray-200 rounded-lg shadow-sm p-5";

    const header = document.createElement("div");
    header.className = "flex flex-col md:flex-row md:items-start md:justify-between gap-4";

    const details = document.createElement("div");
    details.innerHTML = `
      <h4 class="text-xl font-semibold text-[#0b1e35]">${escapeHtml(ad.title)}</h4>
      <p class="text-sm text-[#0b1e35]/80 mt-1">${escapeHtml(ad.location || "Location not specified")}</p>
      <div class="mt-2 text-sm text-gray-500 space-x-3">
        ${ad.contract_type ? `<span>${escapeHtml(ad.contract_type)}</span>` : ""}
        ${ad.salary_min || ad.salary_max ? `<span>€${ad.salary_min ?? "?"} - €${ad.salary_max ?? "?"}</span>` : ""}
        ${ad.date_expiry ? `<span>Expiry: ${escapeHtml(ad.date_expiry)}</span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";

    const editBtn = document.createElement("button");
    editBtn.className = "rounded-md border border-orange-500 px-3 py-1 text-sm font-medium text-orange-600 hover:bg-orange-50";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      openAdForEdit(ad);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "rounded-md border border-red-500 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = window.confirm("Are you sure you want to delete this job posting?");
      if (!confirmDelete) return;
      try {
        const res = await fetch(`${apiBase}/advertisements/${ad.ad_id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete advertisement.");
        await fetchAds();
      } catch (error) {
        console.error(error);
        alert("Unable to delete the job posting.");
      }
    });

    const candidatesBtn = document.createElement("button");
    candidatesBtn.className = "rounded-md bg-[#0b1e35] px-3 py-1 text-sm font-medium text-white hover:bg-[#132b4e]";
    candidatesBtn.textContent = "View candidates";

    const candidatesContainer = document.createElement("div");
    candidatesContainer.className = "mt-4 hidden border-t border-gray-200 pt-4";

    candidatesBtn.addEventListener("click", () => {
      toggleCandidates(ad.ad_id, candidatesContainer, candidatesBtn);
    });

    actions.append(editBtn, deleteBtn, candidatesBtn);
    header.append(details, actions);
    li.appendChild(header);
    li.appendChild(candidatesContainer);

    return li;
  };

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

  const openAdForEdit = (ad) => {
    adFields.adId.value = ad.ad_id;
    adFields.title.value = ad.title || "";
    adFields.location.value = ad.location || "";
    adFields.contractType.value = ad.contract_type || "";
    adFields.salaryMin.value = ad.salary_min ?? "";
    adFields.salaryMax.value = ad.salary_max ?? "";
    adFields.expiry.value = ad.date_expiry || "";
    adFields.description.value = ad.description || "";
    toggleAdFormVisibility(true);
    adFields.title.focus();
  };

  const toggleCandidates = async (adId, container, button) => {
    const isVisible = !container.classList.contains("hidden");
    if (isVisible) {
      container.classList.add("hidden");
      button.textContent = "View candidates";
      return;
    }

    if (container.dataset.loaded === "true") {
      container.classList.remove("hidden");
      button.textContent = "Hide candidates";
      return;
    }

    container.innerHTML = `<p class="text-sm text-gray-500">Loading candidates...</p>`;
    container.classList.remove("hidden");

    try {
      const res = await fetch(`${apiBase}/advertisements/${adId}/candidates`);
      if (!res.ok) throw new Error("Unable to fetch candidates.");
      const candidates = await res.json();
      container.dataset.loaded = "true";
      button.textContent = "Hide candidates";

      if (!Array.isArray(candidates) || !candidates.length) {
        container.innerHTML = `<p class="text-sm text-gray-500">No candidates yet for this posting.</p>`;
        return;
      }

      const list = document.createElement("ul");
      list.className = "space-y-3";
      candidates.forEach((candidate) => {
        const item = document.createElement("li");
        item.className = "rounded-md border border-gray-200 p-3";
        item.innerHTML = `
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div>
              <p class="font-semibold text-[#0b1e35]">${escapeHtml(candidate.first_name)} ${escapeHtml(candidate.last_name)}</p>
              <p class="text-sm text-gray-500">${escapeHtml(candidate.email || "No email provided")} · ${escapeHtml(candidate.phone || "No phone")}</p>
            </div>
            <span class="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">${escapeHtml(candidate.status || "Sent")}</span>
          </div>
          <div class="mt-2 text-sm text-[#0b1e35]/80">
            ${candidate.skills ? `<p><strong>Skills:</strong> ${escapeHtml(candidate.skills)}</p>` : ""}
            ${candidate.experience ? `<p class="mt-1"><strong>Experience:</strong> ${escapeHtml(candidate.experience)}</p>` : ""}
            ${candidate.about ? `<p class="mt-1"><strong>About:</strong> ${escapeHtml(candidate.about)}</p>` : ""}
            ${candidate.message ? `<p class="mt-2"><strong>Application message:</strong><br><span class="whitespace-pre-line block mt-1 text-[#0b1e35]">${formatMultiline(candidate.message)}</span></p>` : ""}
          </div>
        `;
        list.appendChild(item);
      });
      container.innerHTML = "";
      container.appendChild(list);
    } catch (error) {
      console.error(error);
      container.innerHTML = `<p class="text-sm text-red-600">Failed to load candidates.</p>`;
    }
  };

  companyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: companyFields.name?.value.trim() || "",
      industry: companyFields.industry?.value.trim() || "",
      size: companyFields.size?.value.trim() || "",
      website: companyFields.website?.value.trim() || "",
      email: companyFields.email?.value.trim() || "",
      phone: companyFields.phone?.value.trim() || "",
      address: companyFields.address?.value.trim() || "",
    };

    if (!payload.name) {
      alert("Company name is required.");
      return;
    }

    try {
      const res = await fetch(`${apiBase}/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save company information.");
      showTemporaryStatus(companyStatus);
    } catch (error) {
      console.error(error);
      alert("Unable to update the company profile.");
    }
  });

  toggleAdFormBtn?.addEventListener("click", () => {
    toggleAdFormVisibility();
    if (!adForm.classList.contains("hidden")) {
      adFields.title.focus();
    }
  });

  cancelAdBtn?.addEventListener("click", () => {
    resetAdForm();
  });

  adForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const salaryMinValue = parseNumber(adFields.salaryMin.value);
    const salaryMaxValue = parseNumber(adFields.salaryMax.value);
    const maxAllowedSalary = 99999999.99;

    if (salaryMinValue !== null && salaryMinValue < 0) {
      alert("Salary minimum must be greater than or equal to 0.");
      return;
    }

    if (salaryMaxValue !== null && salaryMaxValue < 0) {
      alert("Salary maximum must be greater than or equal to 0.");
      return;
    }

    if (salaryMinValue !== null && salaryMinValue > maxAllowedSalary) {
      alert(`Salary minimum cannot exceed €${maxAllowedSalary.toLocaleString("fr-FR")}.`);
      return;
    }

    if (salaryMaxValue !== null && salaryMaxValue > maxAllowedSalary) {
      alert(`Salary maximum cannot exceed €${maxAllowedSalary.toLocaleString("fr-FR")}.`);
      return;
    }

    if (salaryMinValue !== null && salaryMaxValue !== null && salaryMinValue > salaryMaxValue) {
      alert("Salary minimum cannot be greater than salary maximum.");
      return;
    }

    const payload = {
      title: adFields.title.value.trim(),
      description: adFields.description.value.trim(),
      location: adFields.location.value.trim() || null,
      salary_min: salaryMinValue,
      salary_max: salaryMaxValue,
      contract_type: adFields.contractType.value.trim() || null,
      date_expiry: adFields.expiry.value || null,
    };

    if (!payload.title || !payload.description) {
      alert("Title and description are required.");
      return;
    }

    const adId = adFields.adId.value;
    const isUpdate = Boolean(adId);

    try {
      const endpoint = isUpdate ? `${apiBase}/advertisements/${adId}` : `${apiBase}/advertisements`;
      const method = isUpdate ? "PUT" : "POST";
      const body = isUpdate ? JSON.stringify(payload) : JSON.stringify({ ...payload, company_id: companyId });

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        let detailMessage = "Unable to save the job posting.";
        try {
          const errorData = await res.json();
          if (errorData?.detail) {
            detailMessage = Array.isArray(errorData.detail)
              ? errorData.detail.join(", ")
              : errorData.detail;
          }
        } catch (_) {
          // ignored
        }
        throw new Error(detailMessage);
      }
      resetAdForm();
      await fetchAds();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Unable to save the job posting.");
    }
  });

  fetchCompany();
  fetchAds();
});
