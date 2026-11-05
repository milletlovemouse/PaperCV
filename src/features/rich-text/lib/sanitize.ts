import DOMPurify from "dompurify";

export const blockTags = new Set(["P", "DIV", "LI", "UL", "OL", "BLOCKQUOTE"]);

export function safeLink(value: string): string | null {
  const href = value.trim();
  if (!href || /[\u0000-\u0020\u007f-\u009f\\]/.test(href)) return null;
  try {
    const url = new URL(href);
    if (/^https?:$/i.test(url.protocol) && /^https?:\/\//i.test(href) && url.hostname) return href;
    if (url.protocol === "mailto:" && /^[^/?#@]+@[^/?#@]+$/.test(url.pathname)) return href;
    if (
      url.protocol === "tel:" &&
      /^\+?[\d().-]+$/.test(url.pathname) &&
      /\d/.test(url.pathname) &&
      !url.search &&
      !url.hash
    )
      return href;
  } catch {
    /* Invalid or relative URLs are not links. */
  }
  return null;
}

export const sanitizeRichText = (html: string): string => {
  // Work on an inert fragment; do not install global DOMPurify hooks.
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "div",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "a",
      "span",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "title", "style"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll<HTMLElement>("*").forEach((element) => {
    const align = element.style.textAlign.trim().toLowerCase();
    const margin = element.style.marginLeft.trim();
    element.removeAttribute("style");
    if (blockTags.has(element.tagName)) {
      if (["left", "center", "right", "justify"].includes(align)) element.style.textAlign = align;
      if (/^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(margin) || margin === "0") {
        element.style.marginLeft = `${Math.min(120, Math.max(0, parseFloat(margin)))}px`;
      }
    }
    if (element.tagName === "A") {
      const href = safeLink(element.getAttribute("href") || "");
      if (href) element.setAttribute("href", href);
      else element.removeAttribute("href");
    } else {
      element.removeAttribute("href");
    }
  });
  // Chromium can indent into a sibling list, or leave a list-only LI behind.
  // Attach those sublists to the preceding item so they have no extra marker.
  Array.from(fragment.querySelectorAll("ul,ol"))
    .reverse()
    .forEach((list) => {
      Array.from(list.children).forEach((child) => {
        if (child.matches("ul,ol") && child.previousElementSibling?.tagName === "LI") {
          child.previousElementSibling.append(child);
        } else if (child.tagName === "LI" && child.previousElementSibling?.tagName === "LI") {
          const content = child.cloneNode(true) as HTMLElement;
          content.querySelectorAll("ul,ol").forEach((nested) => nested.remove());
          if (!content.textContent?.trim() && child.querySelector("ul,ol")) {
            // A BR before the sublist is an intentional empty paragraph.
            // Moving it inline would turn it into the preceding line's terminator.
            Array.from(child.childNodes).forEach((node) => {
              if (node instanceof HTMLElement && node.tagName === "BR") {
                const paragraph = document.createElement("div");
                node.replaceWith(paragraph);
                paragraph.append(node);
              }
            });
            child.previousElementSibling.append(...child.childNodes);
            child.remove();
          }
        }
      });
    });
  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
};
