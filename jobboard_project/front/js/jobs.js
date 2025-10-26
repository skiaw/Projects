(() => {
  const apiBase = "http://127.0.0.1:8000";
  const staticJobs = window.staticJobs ?? [];
  let jobList;

  function ensureJobList() {
    jobList = document.getElementById("job-list");
    return jobList;
  }

  function createJobCard(title, description, location, salary, id = null) {
    if (!ensureJobList()) {
      return;
    }

    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition";
    const clickAction = id
      ? `showDynamicDetails(${id})`
      : `openStaticDetails('${title}', '${description}', '${location}', '${salary}')`;
    card.innerHTML = `
      <h2 class="text-2xl font-bold text-[#0b1e35]" style="font-family: 'Playfair Display', serif;">${title}</h2>
      <p class="text-gray-600 mt-3">${description.substring(0, 100)}...</p>
      <button onclick="${clickAction}" class="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full transition">
        Learn more
      </button>
    `;
    jobList.appendChild(card);
  }

  async function populateJobs() {
    if (!ensureJobList()) {
      return;
    }

    jobList.innerHTML = "";

    try {
      const response = await fetch(`${apiBase}/advertisements`);
      const ads = await response.json();
      if (Array.isArray(ads) && ads.length > 0) {
        ads.forEach((ad) => {
          createJobCard(
            ad.title,
            ad.description,
            ad.location || "Location not specified",
            ad.salary_min && ad.salary_max ? `${ad.salary_min} - ${ad.salary_max} €` : "Salary not specified",
            ad.ad_id,
          );
        });
        return;
      }
    } catch {
      // Ignore recoverable errors, fallback handled below.
    }

    staticJobs.forEach((job) =>
      createJobCard(job.title, job.description, job.location, job.salary),
    );
  }

  function initJobsPage() {
    if (!ensureJobList()) {
      return;
    }
    populateJobs();
  }

  document.addEventListener("DOMContentLoaded", initJobsPage);
  window.initJobsPage = initJobsPage;
})();

function openStaticDetails(title, description, location, salary) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black/50 flex justify-center items-center z-50";
  modal.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg w-96 relative">
      <button onclick="this.closest('.fixed').remove()" class="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
      <h2 class="text-2xl font-bold mb-2">${title}</h2>
      <p class="text-gray-700 mb-2">${description}</p>
      <p class="text-gray-600 mb-2"> ${location}</p>
      <p class="text-gray-600 mb-4"> ${salary}</p>
      <div class="flex justify-between">
        <button onclick="openApplyForm(0, '${title.replace(/'/g, "\\'")}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Apply</button>
        <button onclick="this.closest('.fixed').remove()" class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function showDynamicDetails(adId) {
  const apiBase = "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${apiBase}/advertisements/${adId}`);
    const ad = await response.json();
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 flex justify-center items-center z-50";
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <button onclick="this.closest('.fixed').remove()" class="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
        <h2 class="text-2xl font-bold mb-2">${ad.title}</h2>
        <p class="text-gray-700 mb-2">${ad.description}</p>
        <p class="text-gray-600 mb-2"> ${ad.location || "Location not specified"}</p>
        <p class="text-gray-600 mb-4"> ${
          ad.salary_min && ad.salary_max ? `${ad.salary_min} - ${ad.salary_max} €` : "Salary not specified"
        }</p>
        <div class="flex justify-between">
          <button onclick="openApplyForm(${ad.ad_id}, '${ad.title.replace(/'/g, "\\'")}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Apply</button>
          <button onclick="this.closest('.fixed').remove()" class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch {
    alert("Unable to load job details from API.");
  }
}

function openApplyForm(adId, title) {
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to read stored user:", error);
      return null;
    }
  })();

  if (!storedUser) {
    alert("Please log in to apply for this job.");
    window.location.href = "login.html";
    return;
  }

  const isCandidate = storedUser.role === "Applicant";
  if (!isCandidate) {
    alert("Only candidate accounts can apply to jobs.");
    return;
  }

  document.querySelectorAll(".fixed").forEach(m => m.remove());
  const formModal = document.createElement("div");
  formModal.className = "fixed inset-0 bg-black/50 flex justify-center items-center z-50";
  formModal.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg w-96 relative">
      <button onclick="this.closest('.fixed').remove()" class="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
      <h2 class="text-2xl font-bold mb-4 text-center">Apply for: ${title}</h2>
      <form id="apply-form" class="space-y-3">
        <input type="hidden" id="ad-id" value="${adId}">
        <input type="text" id="name" placeholder="Full name" class="w-full border p-2 rounded" required>
        <input type="email" id="email" placeholder="Email" class="w-full border p-2 rounded" required>
        <input type="text" id="phone" placeholder="Phone" class="w-full border p-2 rounded" required>
        <textarea id="message" placeholder="Your message..." class="w-full border p-2 rounded" required></textarea>
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Send Application</button>
      </form>
    </div>
  `;
  document.body.appendChild(formModal);

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const messageInput = document.getElementById("message");

  const first = storedUser.first_name || "";
  const last = storedUser.last_name || "";
  const fullName = `${first} ${last}`.trim();
  if (fullName) {
    nameInput.value = fullName;
  }
  if (storedUser.email) {
    emailInput.value = storedUser.email;
  }
  if (storedUser.phone) {
    phoneInput.value = storedUser.phone;
  }
  if (!messageInput.placeholder) {
    messageInput.placeholder = "Write a short message to the recruiter...";
  }

  document.getElementById("apply-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      ad_id: parseInt(document.getElementById("ad-id").value),
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      message: document.getElementById("message").value,
      person_id: storedUser.person_id
    };
    try {
      const response = await fetch("http://127.0.0.1:8000/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        alert("Application submitted successfully!");
        formModal.remove();
      } else {
        const err = await response.json().catch(() => ({}));
        const message = err.detail || "Could not send application.";
        alert("Error: " + message);
        if (err.detail === "You have already applied to this advertisement.") {
          formModal.remove();
        }
      }
    } catch {
      alert("Server connection error.");
    }
  });
}
