type Point = { path: number[]; offset: number; textOffset: number };
export type Bookmark = { start: Point; end: Point; backward: boolean };
export type Snapshot = { html: string; selection: Bookmark | null };

export function bookmark(root: HTMLElement): Bookmark | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  function point(node: Node, offset: number): Point {
    const path: number[] = [];
    let child = node;
    while (child !== root && child.parentNode) {
      path.unshift(Array.prototype.indexOf.call(child.parentNode.childNodes, child));
      child = child.parentNode;
    }
    const prefix = document.createRange();
    prefix.selectNodeContents(root);
    prefix.setEnd(node, offset);
    return { path, offset, textOffset: prefix.toString().length };
  }
  return {
    start: point(range.startContainer, range.startOffset),
    end: point(range.endContainer, range.endOffset),
    backward: selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset,
  };
}

export function restoreBookmark(root: HTMLElement, saved: Bookmark) {
  function resolve(point: Point): [Node, number] {
    let node: Node | undefined = root;
    for (const index of point.path) node = node?.childNodes[index];
    if (
      node &&
      point.offset <= (node.nodeType === Node.TEXT_NODE ? node.textContent!.length : node.childNodes.length)
    ) {
      const prefix = document.createRange();
      prefix.selectNodeContents(root);
      prefix.setEnd(node, point.offset);
      if (prefix.toString().length === point.textOffset) return [node, point.offset];
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = point.textOffset;
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (remaining <= text.textContent!.length) return [text, remaining];
      remaining -= text.textContent!.length;
    }
    return [root, root.childNodes.length];
  }
  const start = resolve(saved.start);
  const end = resolve(saved.end);
  window
    .getSelection()
    ?.setBaseAndExtent(...(saved.backward ? ([...end, ...start] as const) : ([...start, ...end] as const)));
}
