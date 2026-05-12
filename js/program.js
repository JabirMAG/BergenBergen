/**
 * Programside: søk og dagfilter mot statisk HTML (seksjoner per dag).
 */
const programInnhold = document.getElementById("program-innhold");
const programStatus = document.getElementById("program-status");
const searchInput = document.getElementById("artist-sok");
const filterButtons = document.querySelectorAll("[data-day-filter]");

function applyProgramFilters() {
  if (!programInnhold || !programStatus || !searchInput || filterButtons.length === 0) {
    return;
  }

  const activeBtn = document.querySelector(".filter-button.filter-button--active[data-day-filter]");
  const dayKey = activeBtn?.dataset.dayFilter ?? "alle";
  const query = searchInput.value.trim().toLowerCase();

  const sections = programInnhold.querySelectorAll(".program-day[data-day]");
  let visibleArtists = 0;

  sections.forEach((section) => {
    const sectionDay = section.dataset.day;
    const dayMatches = dayKey === "alle" || sectionDay === dayKey;

    if (!dayMatches) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const items = section.querySelectorAll(".program-day__item");
    items.forEach((item) => {
      const artistEl = item.querySelector(".program-day__link");
      const name = artistEl?.textContent?.trim().toLowerCase() ?? "";
      const searchMatches = !query || name.includes(query);
      item.hidden = !searchMatches;
      if (searchMatches) {
        visibleArtists += 1;
      }
    });

    const anyVisible = Array.from(items).some((item) => !item.hidden);
    section.hidden = !anyVisible;
  });

  if (visibleArtists === 0) {
    programStatus.textContent = "Ingen artister matcher søket eller valgt dag.";
  } else {
    programStatus.textContent =
      visibleArtists === 1 ? "1 artist." : `${visibleArtists} artister.`;
  }
}

function setDayFilter(day) {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.dayFilter === day;
    button.classList.toggle("filter-button--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  applyProgramFilters();
}

if (programInnhold && programStatus && searchInput && filterButtons.length > 0) {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setDayFilter(button.dataset.dayFilter);
    });
  });

  searchInput.addEventListener("input", () => {
    applyProgramFilters();
  });

  applyProgramFilters();
}
