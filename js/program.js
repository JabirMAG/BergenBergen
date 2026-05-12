/**
 * Programside: søk og dagfilter mot statisk HTML (seksjoner per dag).
 */
const programInnhold = document.getElementById("program-innhold");
const programStatus = document.getElementById("program-status");
const searchInput = document.getElementById("artist-sok");
const filterButtons = document.querySelectorAll("[data-day-filter]");

function countTotalArtists(root) {
  return root.querySelectorAll(".program-day__item").length;
}

function getArtistSearchText(item) {
  const fromData = item.dataset.artistName;
  if (fromData) return fromData;
  const nameEl = item.querySelector(".program-day__name");
  return nameEl?.textContent?.trim().toLowerCase() ?? "";
}

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
      const name = getArtistSearchText(item);
      const searchMatches = !query || name.includes(query);
      item.hidden = !searchMatches;
      if (searchMatches) {
        visibleArtists += 1;
      }
    });

    const anyVisible = Array.from(items).some((item) => !item.hidden);
    section.hidden = !anyVisible;
  });

  const total = countTotalArtists(programInnhold);

  if (visibleArtists === 0) {
    programStatus.textContent = "Ingen artister matcher søket eller valgt dag.";
  } else if (visibleArtists === total && dayKey === "alle" && !query) {
    programStatus.textContent = "";
  } else {
    programStatus.textContent = `Viser ${visibleArtists} av ${total} artister.`;
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
