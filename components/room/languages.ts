/** Names for the languages built-in card sets come in: native name first, then English. */
const LANGUAGES: Record<string, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  ca: { native: "Català", english: "Catalan" },
  cs: { native: "Čeština", english: "Czech" },
  de: { native: "Deutsch", english: "German" },
  el: { native: "Ελληνικά", english: "Greek" },
  es: { native: "Español", english: "Spanish" },
  gl: { native: "Galego", english: "Galician" },
  he: { native: "עברית", english: "Hebrew" },
  it: { native: "Italiano", english: "Italian" },
  nl: { native: "Nederlands", english: "Dutch" },
  pt: { native: "Português", english: "Portuguese" },
  ro: { native: "Română", english: "Romanian" },
  ru: { native: "Русский", english: "Russian" },
  tr: { native: "Türkçe", english: "Turkish" },
};

export function languageName(code: string): { native: string; english: string } {
  return LANGUAGES[code] ?? { native: code, english: code };
}
