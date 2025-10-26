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

  const readonlyFieldIds = ["first_name", "last_name", "email"];
  readonlyFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const storedValue = accountData?.[id];
    if (storedValue) {
      el.value = storedValue;
      el.readOnly = true;
      el.classList.add("bg-gray-100", "cursor-not-allowed");
    }
  });

  const saveBtn = document.getElementById("save-profile");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };

    const formData = {
      first_name: accountData?.first_name || getValue("first_name"),
      last_name: accountData?.last_name || getValue("last_name"),
      email: accountData?.email || getValue("email"),
      phone: accountData?.phone || getValue("phone"),
      location: getValue("location"),
      years_experience: getValue("years_experience"),
      education: getValue("education"),
      skills: getValue("skills"),
      experience: getValue("experience"),
      about: getValue("about"),
      password: accountData?.password || getValue("password") || "default123"
    };

    for (const [key, value] of Object.entries(formData)) {
      if (["first_name", "last_name", "email"].includes(key) && !value) {
        alert(`⚠️ Please fill in the ${key.replace("_", " ")} field.`);
        return;
      }
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Server error");
      const result = await res.json();
      console.log(" Candidate created:", result);
      if (result?.person_id) {
        const userData = {
          person_id: result.person_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          role: "Applicant"
        };
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("person_id", result.person_id);
      }
      localStorage.removeItem("accountData");
      localStorage.removeItem("selectedAccountType");
      alert(" Your profile has been created successfully!");
      window.location.href = "personnalspace.html";
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create profile");
    }
  });
});
