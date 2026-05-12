/**
 * Felles navigasjon: mobilmeny og tastaturnavigasjon.
 */
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

function closeMenu() {
  if (!siteNav || !menuToggle) return;
  siteNav.classList.remove("site-nav--open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Åpne navigasjonsmeny");
}

function openMenu() {
  if (!siteNav || !menuToggle) return;
  siteNav.classList.add("site-nav--open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Lukk navigasjonsmeny");
}

function toggleMenu() {
  if (!siteNav || !menuToggle) return;
  if (siteNav.classList.contains("site-nav--open")) {
    closeMenu();
  } else {
    openMenu();
  }
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", toggleMenu);
  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav?.classList.contains("site-nav--open")) {
    closeMenu();
    menuToggle?.focus();
  }
});
