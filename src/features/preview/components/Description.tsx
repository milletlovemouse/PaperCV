import type { CSSProperties } from "react";
import type { Resume } from "@resume/model";
import { sanitizeRichText } from "@/features/rich-text/lib/sanitize";

export default function Description({
  html,
  sectionId,
  entryId,
  kind = "custom",
  standard = false,
  bodyAlign = "auto",
  skillStyle = "text",
}: {
  html: string;
  sectionId: string;
  entryId: string;
  kind?: Resume["sections"][number]["kind"];
  standard?: boolean;
  bodyAlign?: Resume["style"]["bodyAlign"];
  skillStyle?: Resume["style"]["skillStyle"];
}) {
  const parsed = new DOMParser().parseFromString(sanitizeRichText(html), "text/html");
  const parts: Array<{
    html: string;
    bullet: boolean;
    listItem?: boolean;
    order?: number;
    depth: number;
    align?: CSSProperties["textAlign"];
    indent?: number;
  }> = [];
  type Formatting = { align?: CSSProperties["textAlign"]; indent?: number };
  type Marker = { order?: number; pending: boolean };
  function collect(node: Node, depth = 0, inherited: Formatting = {}, marker?: Marker, listDepth = 0) {
    const formatting =
      node instanceof HTMLElement
        ? {
            align: (["left", "right", "center", "justify"].includes(node.style.textAlign)
              ? node.style.textAlign
              : inherited.align) as CSSProperties["textAlign"],
            indent: Math.min(
              120,
              (inherited.indent || 0) + Math.max(0, parseFloat(node.style.marginLeft) || 0),
            ),
          }
        : inherited;
    if (node instanceof HTMLElement && ["UL", "OL"].includes(node.tagName)) {
      const nestedDepth = depth + (listDepth > 0 ? 1 : 0);
      let index = 0;
      Array.from(node.children).forEach((child) => {
        const itemMarker =
          child.tagName === "LI"
            ? { pending: true, order: node.tagName === "OL" ? ++index : undefined }
            : undefined;
        collect(child, nestedDepth, formatting, itemMarker, listDepth + 1);
      });
      return;
    }
    if (node instanceof HTMLElement) {
      const contentDepth = depth + (node.tagName === "BLOCKQUOTE" ? 1 : 0);
      // Split structural blocks while keeping adjacent inline nodes in one row.
      const inline = document.createElement("div");
      const flush = () => {
        if (inline.textContent?.trim() || inline.querySelector("br")) {
          parts.push({
            html: inline.innerHTML,
            bullet: Boolean(marker?.pending),
            listItem: Boolean(marker),
            order: marker?.order,
            depth: contentDepth,
            ...formatting,
          });
          if (marker) marker.pending = false;
        }
        inline.replaceChildren();
      };
      Array.from(node.childNodes).forEach((child) => {
        if (
          child instanceof HTMLElement &&
          ["P", "DIV", "LI", "UL", "OL", "BLOCKQUOTE"].includes(child.tagName)
        ) {
          flush();
          collect(child, contentDepth, formatting, marker, listDepth);
        } else inline.append(child.cloneNode(true));
      });
      if (!node.childNodes.length && ["P", "DIV"].includes(node.tagName)) {
        inline.append(document.createElement("br"));
      }
      flush();
    } else if (node.textContent?.trim()) {
      parts.push({
        html: node.textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;"),
        bullet: Boolean(marker?.pending),
        listItem: Boolean(marker),
        order: marker?.order,
        depth,
        ...formatting,
      });
      if (marker) marker.pending = false;
    }
  }
  Array.from(parsed.body.childNodes).forEach((node) => collect(node));
  return (
    <>
      {parts.map((part, index) => (
        <div
          key={index}
          className={`resume-unit body-unit kind-${kind} ${part.bullet && (kind !== "skills" || skillStyle === "text") ? "bullet-unit" : ""}`}
          style={
            {
              textAlign: part.align,
              "--rich-indent": `${part.depth * (standard ? 20 : 16) + (part.indent || 0) + (part.listItem && !part.bullet ? (standard ? 20 : 13) : 0)}px`,
            } as CSSProperties
          }
          data-section={sectionId}
          data-entry={entryId}
          data-splittable="true"
          data-list-depth={part.depth}
          data-list-kind={part.order ? "ordered" : "unordered"}
          data-marker={part.order ? `${part.order}.` : undefined}
          data-list-align={
            part.bullet && (kind !== "skills" || skillStyle === "text") ? part.align || bodyAlign : undefined
          }
        >
          <span className="description-text" dangerouslySetInnerHTML={{ __html: part.html }} />
        </div>
      ))}
    </>
  );
}
