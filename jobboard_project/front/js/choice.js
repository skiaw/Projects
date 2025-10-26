document.addEventListener("DOMContentLoaded", () => {
  const data = (() => {
    try {
      const raw = localStorage.getItem("accountData");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Unable to read account data from storage:", error);
      return null;
    }
  })();

  const messageContainer = document.getElementById("welcome-message");

  if (!messageContainer) {
    console.error("❌ No element with id 'welcome-message' found in choice.html");
    return;
  }

  if (data && data.first_name) {
    const first = data.first_name || "";
    const last = data.last_name || "";
    messageContainer.textContent = `Welcome ${first} 👋`;
  } else {
    messageContainer.textContent = "Welcome! Please choose your next step.";
  }

  const trackSelection = (selector, accountType) => {
    const link = document.querySelector(selector);
    if (!link) return;
    link.addEventListener("click", () => {
      localStorage.setItem("selectedAccountType", accountType);
    });
  };

  trackSelection('a[href="createcandidate.html"]', "candidate");
  trackSelection('a[href="createcompany.html"]', "recruiter");
});
