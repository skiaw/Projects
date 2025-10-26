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
  const role = user?.role;
  const spaceHref = role === "Recruiter"
    ? "recruiterspace.html"
    : role === "Admin"
      ? "adminspace.html"
      : "personnalspace.html";

  const navContainers = Array.from(document.querySelectorAll("[data-nav-auth]"));
  navContainers.forEach((container) => {
    const loginLink = container.querySelector('a[href="login.html"]');
    const jobsLink = container.querySelector('a[href="jobs.html"]');

    if (loginLink) {
      if (user) {
        loginLink.textContent = "My space";
        loginLink.href = spaceHref;
        loginLink.dataset.loggedIn = "true";
      } else {
        loginLink.textContent = "Log in";
        loginLink.href = "login.html";
        delete loginLink.dataset.loggedIn;
      }
    }

    if (jobsLink) {
      if (role === "Recruiter" || role === "Admin") {
        jobsLink.classList.add("hidden");
        jobsLink.setAttribute("aria-hidden", "true");
      } else {
        jobsLink.classList.remove("hidden");
        jobsLink.removeAttribute("aria-hidden");
      }
    }
  });

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  if (user && currentPath === "login.html") {
    window.location.replace(spaceHref);
  }

  const logoutButtons = Array.from(document.querySelectorAll("[data-action='logout']"));
  logoutButtons.forEach((button) => {
    if (user) {
      button.classList.remove("hidden");
    } else {
      button.classList.add("hidden");
    }
  });

  logoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("person_id");
      localStorage.removeItem("accountData");
      localStorage.removeItem("selectedAccountType");
      const current = window.location.pathname.split("/").pop() || "";
      if (current === "personnalspace.html" || current === "recruiterspace.html") {
        window.location.href = "index.html";
      } else {
        window.location.reload();
      }
    });
  });
});
