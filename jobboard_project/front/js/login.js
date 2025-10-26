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
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("error-msg");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    errorMsg.textContent = "";

    if (!email || !password) {
      errorMsg.textContent = "Please enter both email and password.";
      return;
    }

    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) {
          errorMsg.textContent = err.detail || "No account found with this email.";
        } else if (res.status === 401) {
          errorMsg.textContent = err.detail || "Incorrect password.";
        } else {
          errorMsg.textContent = err.detail || "Login failed. Please try again.";
        }
        return;
      }

      const data = await res.json();

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("person_id", data.user.person_id);
        const userRole = data.user.role;
        if (userRole === "Recruiter") {
          window.location.href = "recruiterspace.html";
        } else if (userRole === "Admin") {
          window.location.href = "adminspace.html";
        } else {
          window.location.href = "personnalspace.html";
        }
      } else {
        errorMsg.textContent = "Invalid login response from server.";
      }

    } catch (err) {
      console.error(err);
      if (!errorMsg.textContent) {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          errorMsg.textContent = "Unable to reach the server. Please check your connection and try again.";
        } else {
          errorMsg.textContent = err.message || "Unable to log in right now.";
        }
      }
    }
  });
});
