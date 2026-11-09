import type { CSSProperties } from "react";
import type { Resume } from "@resume/model";
import { bulletMarkers, formatListOrdinal } from "@resume/list-markers";
import { sanitizeRichText } from "@/features/rich-text/lib/sanitize";

export default function Description({
  html,
  sectionId,
  entryId,
  kind = "custom",
  standard = false,
  bodyAlign = "auto",
  skillStyle = "text",
  bulletStyle = "disc",
}: {
  html: string;
  sectionId: string;
  entryId: string;
  kind?: Resume["sections"][number]["kind"];
  standard?: boolean;
  bodyAlign?: Resume["style"]["bodyAlign"];
  skillStyle?: Resume["style"]["skillStyle"];
  bulletStyle?: Resume["style"]["bulletStyle"];
}) {
  const parsed = new DOMParser().parseFromString(sanitizeRichText(html), "text/html");
  const parts: Array<{
    html: string;
    bullet: boolean;
    listItem?: boolean;
    order?: number;
    markerWidth?: string;
    depth: number;
    listDepth: number;
    align?: CSSProperties["textAlign"];
    indent?: number;
  }> = [];
  type Formatting = { align?: CSSProperties["textAlign"]; indent?: number };
  type Marker = { order?: number; width?: string; pending: boolean };
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
      const children = Array.from(node.children);
      // Reserve the same space for every number in a list, including its
      // continuation paragraphs, even when decimal/roman markers grow longer.
      const count = children.filter((child) => child.tagName === "LI").length;
      let width = 2;
      if (node.tagName === "OL") {
        for (let order = 1; order <= count; order++) {
          width = Math.max(width, formatListOrdinal(order, listDepth).length);
        }
      }
      let index = 0;
      children.forEach((child) => {
        const itemMarker =
          child.tagName === "LI"
            ? {
                pending: true,
                order: node.tagName === "OL" ? ++index : undefined,
                width: `${width * 0.65}em`,
              }
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
            markerWidth: marker?.width,
            depth: contentDepth,
            listDepth: Math.max(0, listDepth - 1),
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
        markerWidth: marker?.width,
        depth,
        listDepth: Math.max(0, listDepth - 1),
        ...formatting,
      });
      if (marker) marker.pending = false;
    }
  }
  Array.from(parsed.body.childNodes).forEach((node) => collect(node));
  const markers = bulletMarkers(bulletStyle);
  return (
    <>
      {parts.map((part, index) => {
        const marker = part.order ? formatListOrdinal(part.order, part.listDepth) : undefined;
        const markerWidth = marker ? part.markerWidth : undefined;
        const inset = part.depth * (standard ? 20 : 16) + (part.indent || 0);
        return (
          <div
            key={index}
            className={`resume-unit body-unit kind-${kind} ${part.bullet && (kind !== "skills" || skillStyle === "text") ? "bullet-unit" : ""}`}
            style={
              {
                textAlign: part.align,
                "--rich-indent":
                  part.listItem && !part.bullet
                    ? markerWidth
                      ? `calc(${inset}px + ${markerWidth} + 6px)`
                      : `${inset + (standard ? 20 : 13)}px`
                    : `${inset}px`,
                "--list-marker-width": markerWidth,
              } as CSSProperties
            }
            data-section={sectionId}
            data-entry={entryId}
            data-splittable="true"
            data-list-depth={part.listDepth}
            data-list-kind={part.order ? "ordered" : "unordered"}
            data-bullet-marker={
              part.listItem && !part.order ? markers[Math.min(2, part.listDepth)] : undefined
            }
            data-marker={marker}
            data-list-align={
              part.bullet && (kind !== "skills" || skillStyle === "text")
                ? part.align || bodyAlign
                : undefined
            }
          >
            <span className="description-text" dangerouslySetInnerHTML={{ __html: part.html }} />
          </div>
        );
      })}
    </>
  );
}
