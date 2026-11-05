import type { Dispatch, SetStateAction } from "react";
import type { Entry, Resume, Section } from "@resume/model";

export type EditorTab = "content" | "templates" | "style";
export type StateSetter<T> = Dispatch<SetStateAction<T>>;
export type { ResumeUpdater } from "@resume/model";
export type SectionUpdater = (id: string, change: (section: Section) => Section, separate?: boolean) => void;
export type EntryUpdater = (sectionId: string, entryId: string, key: keyof Entry, value: string) => void;
export type StyleUpdater = (key: keyof Resume["style"], value: string | number | boolean) => void;
export interface Confirmation {
  title: string;
  message: string;
  action: () => void;
}
