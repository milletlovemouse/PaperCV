/** Resolve title/metadata collisions before pagination so screen and print
 * use the same rows, including after a font, paper or margin change. */
export function layoutEntryHeadings(root: HTMLElement) {
  const preview = root.closest(".resume-preview");
  const centered = preview?.getAttribute("data-entry-title-align") === "center";
  const metadataLeft = preview?.getAttribute("data-entry-meta-align") === "left";
  const measurements = Array.from(root.querySelectorAll<HTMLElement>(".entry-one-line")).map((heading) => {
    delete heading.dataset.metadataRow;
    delete heading.dataset.titlePositioned;
    heading.style.removeProperty("--entry-title-left");
    heading.style.removeProperty("--entry-title-width");
    const row = heading.querySelector<HTMLElement>(".entry-first-row")!;
    const probe = row.cloneNode(true) as HTMLElement;
    probe.classList.add("entry-width-probe");
    heading.appendChild(probe);
    return { heading, row, probe };
  });
  try {
    const decisions = measurements.map(({ heading, row, probe }) => {
      const title = probe.querySelector<HTMLElement>(".entry-title-group")!;
      const metadata = probe.querySelector<HTMLElement>(".entry-date")!;
      const titleWidth = title.getBoundingClientRect().width;
      const metadataWidth = metadata.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      // The timeline's display:contents row has no box; its heading does.
      const available = row.getBoundingClientRect().width || heading.getBoundingClientRect().width;
      const required = titleWidth + metadataWidth + gap;
      const stacked = titleWidth > 0 && metadataWidth > 0 && required > available + 0.5;
      const width = Math.min(titleWidth, available);
      // Keep the page midpoint when possible. Clamp to the remaining free
      // interval before considering a new metadata row.
      const clearance = metadataWidth > 0 ? metadataWidth + gap : 0;
      const minimum = metadataLeft ? clearance : 0;
      const maximum = available - width - (metadataLeft ? 0 : clearance);
      const left = Math.max(0, Math.max(minimum, Math.min((available - width) / 2, maximum)));
      return { heading, stacked, left, width };
    });
    for (const { heading, stacked, left, width } of decisions) {
      if (stacked) heading.dataset.metadataRow = "true";
      else if (centered) {
        heading.dataset.titlePositioned = "true";
        heading.style.setProperty("--entry-title-left", `${left}px`);
        heading.style.setProperty("--entry-title-width", `${width}px`);
      }
    }
  } finally {
    for (const { probe } of measurements) probe.remove();
  }
}
