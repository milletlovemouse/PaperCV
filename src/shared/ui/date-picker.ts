import { parseDateParts } from "@resume/editor-config";

export const CALENDAR_YEARS = Array.from({ length: 201 }, (_, index) => 1900 + index);

/** Construct local dates explicitly; parsing ISO strings as UTC can shift the selected day. */
export function calendarDate(value: string): Date | null {
  const parts = parseDateParts(value);
  if (!parts || +parts.year < 1900 || +parts.year > 2100) return null;
  return new Date(+parts.year, (parts.month || 1) - 1, parts.day || 1);
}
export function calendarValue(date: Date, daily: boolean): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}${daily ? `-${day}` : ""}`;
}
