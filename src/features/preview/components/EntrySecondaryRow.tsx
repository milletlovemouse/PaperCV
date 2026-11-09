import type { ReactNode } from "react";
import type { Resume } from "@resume/model";

export default function EntrySecondaryRow({
  subtitle,
  metadata,
  link,
  style,
}: {
  subtitle: string;
  metadata: ReactNode;
  link?: ReactNode;
  style: Resume["style"];
}) {
  const subtitleAlign = style.entrySubtitleAlign || "left";
  const metaAlign = style.entryMetaAlign || "right";
  const linkAlign = style.entryLinkAlign || "right";
  const subtitleNode = subtitle ? <span className="entry-subtitle">{subtitle}</span> : null;
  const metadataNode = metadata ? <span className="entry-secondary-meta">{metadata}</span> : null;
  const linkNode = link ? (
    <span className="entry-inline-link" data-link-align={linkAlign}>
      {link}
    </span>
  ) : null;
  if (!linkNode) {
    return (
      <div className="entry-second-row">
        {subtitleNode}
        {metadataNode}
      </div>
    );
  }
  const paired = Boolean(subtitleNode && subtitleAlign === linkAlign);
  const groups = (["left", "center", "right"] as const).map((align) => ({
    align,
    subtitle: subtitleAlign === align ? subtitleNode : null,
    metadata: metaAlign === align ? metadataNode : null,
    link: linkAlign === align ? linkNode : null,
  }));
  const occupied = groups.filter((group) => group.subtitle || group.metadata || group.link);
  return (
    <div
      className="entry-second-row"
      data-inline-groups={occupied.length}
      data-inline-center={occupied.some((group) => group.align === "center") || undefined}
      data-inline-pair={paired ? subtitleAlign : undefined}
    >
      {groups.map((group) => (
        <span className="entry-secondary-group" data-align={group.align} key={group.align}>
          {group.metadata}
          {paired && group.subtitle ? (
            <span className="entry-subtitle-link-group">
              {group.subtitle}
              {group.link}
            </span>
          ) : (
            <>
              {group.subtitle}
              {group.link}
            </>
          )}
        </span>
      ))}
    </div>
  );
}
