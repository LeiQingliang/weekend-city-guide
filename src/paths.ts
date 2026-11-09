/** Keep static assets and shared links within the Vite deployment base. */
export function asset(filename: string): string {
  return `${import.meta.env?.BASE_URL || "/weekend-city-guide/"}images/${filename.replace(/^\/+/, "")}`;
}

export function siteUrl(): string {
  return new URL(import.meta.env?.BASE_URL || "/weekend-city-guide/", location.origin).toString();
}
