(() => {
  const status = document.querySelector(".copy-status");

  const announce = (message) => {
    if (!status) return;
    status.textContent = message;
    window.setTimeout(() => {
      status.textContent = "";
    }, 3000);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    }
  };

  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyText(button.dataset.copy || "");
      button.textContent = ok ? "Copied" : "Copy";
      announce(ok ? "Copied to clipboard." : "Copy failed. Select the command and copy it.");
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    });
  });
})();
