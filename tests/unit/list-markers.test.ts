import assert from "node:assert/strict";
import test from "node:test";
import { bulletMarkers, formatListOrdinal } from "../../shared/resume/list-markers";

test("all configured bullets keep three distinct hierarchy markers", () => {
  for (const style of ["disc", "circle", "square", "diamond"] as const) {
    const markers = bulletMarkers(style);
    assert.equal(markers[0], style);
    assert.equal(new Set(markers).size, 3);
  }
  assert.deepEqual(bulletMarkers("auto"), ["disc", "circle", "square"]);
});

test("ordered hierarchy uses decimal, alphabetic and Roman markers including long lists", () => {
  assert.equal(formatListOrdinal(12, 0), "12.");
  assert.equal(formatListOrdinal(1, 1), "a.");
  assert.equal(formatListOrdinal(26, 1), "z.");
  assert.equal(formatListOrdinal(27, 1), "aa.");
  assert.equal(formatListOrdinal(52, 1), "az.");
  assert.equal(formatListOrdinal(1, 2), "i.");
  assert.equal(formatListOrdinal(4, 2), "iv.");
  assert.equal(formatListOrdinal(19, 2), "xix.");
  assert.equal(formatListOrdinal(49, 3), "xlix.");
  assert.equal(formatListOrdinal(4000, 2), "4000.");
});
