/**
 * Theme switch shared by the top bar and the command palette. OURS.
 * Same storage contract as upstream's ThemeSwitcher (localStorage "theme",
 * `dark` class on <html>), so the inline boot script in layout.tsx keeps working.
 */
export function toggleTheme(): "light" | "dark" {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode / blocked storage: the switch still applies for this visit.
  }
  return next;
}
