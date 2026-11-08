import { de } from "./de";
import { en } from "./en";

export type Language = "de" | "en";

export const translations: Record<Language, Record<string, string>> = { de, en };
