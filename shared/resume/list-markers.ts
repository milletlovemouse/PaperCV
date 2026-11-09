import type { Resume } from "./model";

type Bullet = Exclude<Resume["style"]["bulletStyle"], "auto">;

export function bulletMarkers(style: Resume["style"]["bulletStyle"] = "disc"): readonly Bullet[] {
  switch (style) {
    case "circle":
      return ["circle", "disc", "square"];
    case "square":
      return ["square", "circle", "disc"];
    case "diamond":
      return ["diamond", "circle", "square"];
    default:
      return ["disc", "circle", "square"];
  }
}

export function formatListOrdinal(order: number, depth: number): string {
  if (depth === 0) return `${order}.`;
  if (depth === 1) {
    let letters = "";
    for (let value = order; value > 0; value = Math.floor((value - 1) / 26)) {
      letters = String.fromCharCode(97 + ((value - 1) % 26)) + letters;
    }
    return `${letters}.`;
  }
  // CSS lower-roman uses decimal outside its supported range.
  if (order > 3999) return `${order}.`;
  let roman = "";
  let remaining = order;
  for (const [value, symbol] of [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ] as const) {
    while (remaining >= value) {
      roman += symbol;
      remaining -= value;
    }
  }
  return `${roman}.`;
}
