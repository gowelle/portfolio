(() => {
  const grid = document.getElementById("repo-grid");
  if (!grid) return;

  const items = Array.from(grid.children);
  const data = new WeakMap(items.map((item) => [item, item.querySelector(".repo-card")]));
  const originalOrder = new Map(items.map((item, i) => [item, i]));
  const chips = Array.from(document.querySelectorAll("[data-filter]"));
  const search = document.getElementById("search");
  const sort = document.getElementById("sort");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("empty");
  const reset = document.getElementById("reset-filters");

  const state = { category: "all", query: "", sort: "curated" };

  const matches = (item) => {
    const card = data.get(item);
    const categories = (card.dataset.categories || "").split(/\s+/);
    const categoryOk = state.category === "all" || categories.includes(state.category);
    if (!categoryOk) return false;
    if (!state.query) return true;
    const haystack = (card.dataset.search || "") + " " + card.textContent;
    return haystack.toLowerCase().includes(state.query);
  };

  const compare = (a, b) => {
    const cardA = data.get(a);
    const cardB = data.get(b);
    if (state.sort === "stars") {
      return (
        Number(cardB.dataset.stars || 0) - Number(cardA.dataset.stars || 0) ||
        (cardB.dataset.date || "").localeCompare(cardA.dataset.date || "")
      );
    }
    if (state.sort === "updated") {
      return (cardB.dataset.date || "").localeCompare(cardA.dataset.date || "");
    }
    return originalOrder.get(a) - originalOrder.get(b);
  };

  const render = () => {
    let visible = 0;
    items.forEach((item) => {
      const show = matches(item);
      item.hidden = !show;
      if (show) visible += 1;
    });

    [...items].sort(compare).forEach((item) => grid.appendChild(item));

    count.textContent =
      visible === items.length
        ? `${items.length} repositories`
        : `${visible} of ${items.length} repositories`;
    empty.hidden = visible !== 0;
    chips.forEach((chip) =>
      chip.setAttribute("aria-pressed", String(chip.dataset.filter === state.category))
    );
  };

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      state.category = chip.dataset.filter;
      render();
    })
  );

  search.addEventListener("input", () => {
    state.query = search.value.trim().toLowerCase();
    render();
  });

  sort.addEventListener("change", () => {
    state.sort = sort.value;
    render();
  });

  if (reset) {
    reset.addEventListener("click", () => {
      state.category = "all";
      state.query = "";
      state.sort = "curated";
      search.value = "";
      sort.value = "curated";
      render();
      search.focus();
    });
  }

  render();
  window.setTimeout(() => grid.classList.add("entered"), 1500);
})();
