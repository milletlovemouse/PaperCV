import { formatDate, safeURL } from "@resume/editor-config";
import type { Resume } from "@resume/model";
import { partitionSections } from "@resume/templates";

import Description from "./Description";
import EntrySecondaryRow from "./EntrySecondaryRow";
import Identity from "./Identity";

function SectionHeading({ title, sectionId, number }: { title: string; sectionId: string; number: number }) {
  return (
    <div
      className="resume-unit section-heading"
      data-section={sectionId}
      data-keep="next"
      data-number={String(number).padStart(2, "0")}
    >
      <span className="section-title">{title}</span>
    </div>
  );
}
function Summary({ resume }: { resume: Resume }) {
  return resume.profile.summary ? (
    <>
      <SectionHeading title="个人简介" sectionId="profile" number={1} />
      <div className="resume-unit body-unit summary-unit" data-section="profile" data-splittable="true">
        {resume.profile.summary}
      </div>
    </>
  ) : null;
}
export function ResumeContent({ resume }: { resume: Resume }) {
  return (
    <>
      <Identity resume={resume} />
      <Summary resume={resume} />
      {resume.sections
        .filter((section) => section.visible)
        .map((section, index) => (
          <ContentSection
            key={section.id}
            section={section}
            style={resume.style}
            number={index + (resume.profile.summary ? 2 : 1)}
          />
        ))}
    </>
  );
}
function ContentSection({
  section,
  number,
  style,
}: {
  section: Resume["sections"][number];
  number: number;
  style: Resume["style"];
}) {
  return (
    <>
      <SectionHeading title={section.title} sectionId={section.id} number={number} />
      {section.entries
        .filter((entry) => entry.visible !== false)
        .map((entry, entryIndex, entries) => (
          <EntryContent
            key={entry.id}
            entry={entry}
            sectionId={section.id}
            style={style}
            kind={section.kind}
            isLast={entryIndex === entries.length - 1}
          />
        ))}
    </>
  );
}
export function SidebarContent({ resume, column }: { resume: Resume; column: "sidebar" | "main" }) {
  const sections = partitionSections(resume.sections)[column];
  return (
    <>
      {column === "sidebar" && (
        <>
          <Identity resume={resume} />
          <Summary resume={resume} />
        </>
      )}
      {sections.map((section, index) => (
        <ContentSection key={section.id} section={section} style={resume.style} number={index + 1} />
      ))}
    </>
  );
}
function EntryContent({
  entry,
  sectionId,
  style,
  kind,
  isLast,
}: {
  entry: Resume["sections"][number]["entries"][number];
  sectionId: string;
  style: Resume["style"];
  kind: Resume["sections"][number]["kind"];
  isLast: boolean;
}) {
  const separator = style.entrySeparator === "bar" ? " | " : style.entrySeparator === "none" ? " " : " · ";
  const subtitle = [entry.subtitle, entry.degree, entry.college, entry.educationType, entry.department]
    .filter(Boolean)
    .join(separator);
  const dateFormat =
    style.dateFormat === "template"
      ? style.template === "classic"
        ? "numeric"
        : "original"
      : style.dateFormat;
  const dateParts = [entry.start, entry.end].filter(Boolean).map((value) => formatDate(value, dateFormat));
  const date = dateParts.length ? (
    <span className="entry-date-range">
      {dateParts.map((value, index) => (
        <span className="entry-date-part" key={index}>
          {index > 0 ? (style.template === "classic" ? " - " : " — ") : ""}
          {value}
        </span>
      ))}
    </span>
  ) : null;
  const hasHeading = entry.title || subtitle || date || entry.location;
  const primaryMeta = style.entryPriority === "location" ? entry.location : date;
  const secondaryMeta = style.entryPriority === "location" ? date : entry.location;
  const oneLine = style.entryLayout === "one";
  const href = safeURL(entry.url || "");
  const inlineLink =
    !oneLine && Boolean(entry.url) && hasHeading && (style.entryLinkLayout || "inline") === "inline";
  const linkAlign = style.entryLinkAlign || "right";
  const link = href ? <a href={href}>{entry.url}</a> : entry.url;
  return (
    <>
      {hasHeading && (
        <div
          className={`resume-unit entry-heading ${oneLine ? "entry-one-line" : ""}`}
          data-section={sectionId}
          data-entry={entry.id}
          data-keep="next"
        >
          <div className="entry-first-row">
            {oneLine ? (
              <span className="entry-title-group">
                {entry.title && <strong>{entry.title}</strong>}
                {subtitle && <span className="entry-inline-subtitle">{subtitle}</span>}
              </span>
            ) : (
              <strong>{entry.title}</strong>
            )}
            <span className={`entry-date ${style.entryPriority === "location" ? "location-priority" : ""}`}>
              {primaryMeta}
              {oneLine && secondaryMeta && (
                <span className="entry-inline-secondary">
                  {primaryMeta ? separator : ""}
                  {secondaryMeta}
                </span>
              )}
            </span>
          </div>
          {!oneLine && (subtitle || secondaryMeta || inlineLink) && (
            <EntrySecondaryRow
              subtitle={subtitle}
              metadata={secondaryMeta}
              link={inlineLink ? link : undefined}
              style={style}
            />
          )}
          {entry.schoolTags && (
            <div className="school-tags">
              {entry.schoolTags
                .split(/[,，、]/)
                .filter(Boolean)
                .map((tag, i) => (
                  <span key={i}>{tag.trim()}</span>
                ))}
            </div>
          )}
        </div>
      )}
      {entry.url && !inlineLink && (
        <div
          className="resume-unit body-unit entry-link"
          style={{ textAlign: linkAlign }}
          data-section={sectionId}
          data-entry={entry.id}
          data-splittable="true"
        >
          {link}
        </div>
      )}
      {entry.description && (
        <Description
          html={entry.description}
          sectionId={sectionId}
          entryId={entry.id}
          kind={kind}
          standard={style.template === "classic"}
          bodyAlign={style.bodyAlign}
          skillStyle={style.skillStyle}
        />
      )}
      {!isLast && <div className="resume-unit entry-spacer" />}
    </>
  );
}
