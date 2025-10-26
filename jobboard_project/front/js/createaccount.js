document.addEventListener("DOMContentLoaded", () => {
  const nextStepBtn = document.getElementById("next-step");
  if (!nextStepBtn) return;

  nextStepBtn.addEventListener("click", () => {
    const formData = {};
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el.id) formData[el.id] = el.value.trim();
    });
    const requiredInputs = document.querySelectorAll("input[required]");
    for (let input of requiredInputs) {
      if (!input.value.trim()) {
        alert("Please fill in all required fields.");
        return;
      }
    }
    localStorage.setItem("accountData", JSON.stringify(formData));
    window.location.href = "choice.html";
  });
});
