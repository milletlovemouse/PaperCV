/** DOM-based pagination. Fragments contain only their own page's text, so
 * exported PDFs do not repeat hidden off-page copies of the document. */
export function paginate(root: HTMLElement, pageHeight: number): string[] {
  const pending = Array.from(root.children).map((node) => node.cloneNode(true) as HTMLElement);
  const probe = root.cloneNode(false) as HTMLElement;
  probe.removeAttribute("id");
  probe.classList.add("pagination-probe");
  root.parentElement!.appendChild(probe);
  const height = (node: HTMLElement) => {
    probe.replaceChildren(node);
    return node.getBoundingClientRect().height;
  };
  const pages: string[] = [];
  let current: string[] = [];
  let used = 0;
  const flush = () => {
    if (current.length) pages.push(current.join(""));
    current = [];
    used = 0;
  };
  try {
    let iterations = 0;
    while (pending.length) {
      if (++iterations > 2000 || pages.length > 60) throw new Error("内容过长，请精简简历后重试");
      const node = pending.shift()!;
      const nodeHeight = height(node);
      const following = pending[0];
      if (current.length && node.dataset.keep === "next" && following) {
        const nextHeight = height(following.cloneNode(true) as HTMLElement);
        if (used + nodeHeight + Math.min(nextHeight, 45) > pageHeight) flush();
      }
      const remaining = pageHeight - used;
      if (nodeHeight <= remaining + 0.2) {
        current.push(node.outerHTML);
        used += nodeHeight;
        continue;
      }
      if (node.dataset.splittable === "true" && remaining > 38 && (node.textContent?.length || 0) > 20) {
        const split = splitAtHeight(node, remaining, height);
        if (split) {
          current.push(split[0].outerHTML);
          flush();
          pending.unshift(split[1]);
          continue;
        }
      }
      if (current.length) {
        flush();
        pending.unshift(node);
      } else if (nodeHeight > pageHeight) {
        const split = splitAtHeight(node, pageHeight - 1, height);
        if (!split) throw new Error("有一段内容无法分页，请拆分为更短的段落");
        current.push(split[0].outerHTML);
        flush();
        pending.unshift(split[1]);
      } else {
        current.push(node.outerHTML);
        used += nodeHeight;
      }
    }
    flush();
    return pages.length ? pages : [""];
  } finally {
    probe.remove();
  }
}

function splitAtHeight(
  node: HTMLElement,
  maxHeight: number,
  measure: (node: HTMLElement) => number,
): [HTMLElement, HTMLElement] | null {
  const length = node.textContent?.length || 0;
  if (length < 2) return null;
  function parts(offset: number): [HTMLElement, HTMLElement] {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let item = walker.nextNode();
    let remaining = offset;
    while (item && remaining > (item.textContent?.length || 0)) {
      remaining -= item.textContent?.length || 0;
      item = walker.nextNode();
    }
    if (!item) throw new Error("分页文本节点不存在");
    const left = document.createRange();
    left.selectNodeContents(node);
    left.setEnd(item, remaining);
    const right = document.createRange();
    right.selectNodeContents(node);
    right.setStart(item, remaining);
    const head = node.cloneNode(false) as HTMLElement;
    const tail = node.cloneNode(false) as HTMLElement;
    head.append(left.cloneContents());
    tail.append(right.cloneContents());
    tail.classList.add("continued");
    return [head, tail];
  }
  let low = 1,
    high = length - 1,
    best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (measure(parts(mid)[0]) <= maxHeight) {
      best = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  if (!best) return null;
  const raw = node.textContent || "";
  // Prefer a nearby word boundary for Latin text; Chinese can break per glyph.
  const lastSpace = raw.lastIndexOf(" ", best);
  if (lastSpace > best - 25 && lastSpace > best / 2) best = lastSpace + 1;
  if (/[\uDC00-\uDFFF]/.test(raw[best] || "")) best--;
  return best > 0 ? parts(best) : null;
}
