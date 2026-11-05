import { normalizeResume, STORAGE_KEY } from "@resume/model";
import { sampleResume } from "../data/sample";

export function loadResume() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeResume(JSON.parse(saved));
  } catch {
    /* Recover to sample; persistence errors are reported when saving. */
  }
  return sampleResume();
}
