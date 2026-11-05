import type { Entry, Resume, Section } from "@resume/model";
import type { ResumeUpdater } from "../types";

export function useResumeActions(update: ResumeUpdater) {
  const profile = (key: keyof Resume["profile"], value: string) =>
    update((r) => ({ ...r, profile: { ...r.profile, [key]: value } }));
  const style = (key: keyof Resume["style"], value: string | number | boolean) =>
    update((r) => ({ ...r, style: { ...r.style, [key]: value } }));
  function sectionUpdate(id: string, fn: (section: Section) => Section, separate = false) {
    update(
      (r) => ({ ...r, sections: r.sections.map((section) => (section.id === id ? fn(section) : section)) }),
      separate,
    );
  }
  function entryUpdate(sectionId: string, entryId: string, key: keyof Entry, value: string) {
    sectionUpdate(sectionId, (section) => ({
      ...section,
      entries: section.entries.map((entry) => (entry.id === entryId ? { ...entry, [key]: value } : entry)),
    }));
  }
  function moveSection(id: string, direction: number) {
    update((r) => {
      const sections = [...r.sections];
      const index = sections.findIndex((s) => s.id === id);
      const target = index + direction;
      if (target < 0 || target >= sections.length) return r;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...r, sections };
    }, true);
  }
  function moveEntry(sectionId: string, entryIndex: number, direction: number) {
    sectionUpdate(
      sectionId,
      (section) => {
        const entries = [...section.entries];
        const target = entryIndex + direction;
        if (target < 0 || target >= entries.length) return section;
        [entries[entryIndex], entries[target]] = [entries[target], entries[entryIndex]];
        return { ...section, entries };
      },
      true,
    );
  }
  return { profile, style, sectionUpdate, entryUpdate, moveSection, moveEntry };
}
