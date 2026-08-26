export function setLoadingSurface(element, isLoading) {
  if (!element) return;
  const active = Boolean(isLoading);
  element.classList.toggle("is-active", active);
  element.setAttribute("aria-hidden", String(!active));
}

export function setBusyRegion(element, isLoading) {
  if (!element) return;
  element.setAttribute("aria-busy", String(Boolean(isLoading)));
}
