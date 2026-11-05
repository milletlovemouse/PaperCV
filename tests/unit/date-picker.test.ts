import assert from "node:assert/strict";
import test from "node:test";
import { calendarDate, calendarValue } from "../../src/shared/ui/date-picker";

test("calendar accepts legacy imported dates and stores local month/day precision", () => {
  for (const source of ["2022.05", "2022年5月", "2022-05"]) {
    const date = calendarDate(source)!;
    assert.equal(date.getFullYear(), 2022);
    assert.equal(date.getMonth(), 4);
    assert.equal(calendarValue(date, false), "2022-05");
  }
  const leapDay = calendarDate("2024-02-29")!;
  assert.equal(leapDay.getDate(), 29);
  assert.equal(calendarValue(leapDay, true), "2024-02-29");
  assert.equal(calendarValue(new Date(2026, 10, 4), true), "2026-11-04");
  assert.equal(calendarDate("2023-02-29"), null);
  assert.equal(calendarDate("至今"), null);
  assert.equal(calendarDate(""), null);
  assert.equal(calendarDate("1800-01"), null);
  assert.equal(calendarDate("2101-01"), null);
});
