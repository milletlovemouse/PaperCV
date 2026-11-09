/** Resolve title/metadata collisions before pagination so screen and print
 * use the same rows, including after a font, paper or margin change. */
export function layoutEntryHeadings(root: HTMLElement) {
  const centered = root.closest(".resume-preview")?.getAttribute("data-entry-title-align") === "center";
  const measurements = Array.from(root.querySelectorAll<HTMLElement>(".entry-one-line")).map((heading) => {
    delete heading.dataset.metadataRow;
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
      const required = titleWidth + (centered ? 2 : 1) * (metadataWidth + gap);
      return { heading, stacked: titleWidth > 0 && metadataWidth > 0 && required > available + 0.5 };
    });
    for (const { heading, stacked } of decisions) {
      if (stacked) heading.dataset.metadataRow = "true";
    }
  } finally {
    for (const { probe } of measurements) probe.remove();
  }
}
