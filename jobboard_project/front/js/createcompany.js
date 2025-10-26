document.addEventListener("DOMContentLoaded", () => {
  const accountData = (() => {
    try {
      const raw = localStorage.getItem("accountData");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to parse account data from storage:", error);
      return null;
    }
  })();

  const nextBtn = document.getElementById("next-step-company");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", async () => {
    const formData = {};
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el.id) formData[el.id] = el.value.trim();
    });

    for (const key of ["name", "industry", "size", "email"]) {
      if (!formData[key]) {
        alert(`Please fill in the ${key} field.`);
        return;
      }
    }

    const recruiterData = {
      first_name: accountData?.first_name?.trim(),
      last_name: accountData?.last_name?.trim(),
      email: accountData?.email?.trim(),
      phone: accountData?.phone?.trim(),
      password: accountData?.password
    };

    const missingRecruiter = Object.entries(recruiterData)
      .filter(([key, value]) => !value)
      .map(([key]) => key.replace("_", " "));
    if (missingRecruiter.length) {
      alert(`Missing account information: ${missingRecruiter.join(", ")}. Please restart the account creation process.`);
      return;
    }

    const payload = {
      company: formData,
      recruiter: recruiterData
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server error");
      const result = await res.json();
      console.log("Company saved:", result);
      if (result.recruiter) {
        localStorage.setItem("user", JSON.stringify(result.recruiter));
        if (result.recruiter.person_id) {
          localStorage.setItem("person_id", result.recruiter.person_id);
        }
      }
      localStorage.removeItem("accountData");
      localStorage.removeItem("selectedAccountType");
      alert("Company created successfully!");
      window.location.href = "recruiterspace.html";

    } catch (error) {
      console.error("Error creating company:", error);
      alert("Failed to create company");
    }
  });
});
