/** The site's arrow glyph, byte-for-byte the legacy path. Some legacy pages
 *  mark it aria-hidden and some omit the attribute; `ariaHidden` preserves
 *  each page's exact markup. */
export function Arrow({
  d = "M5 12h14m-6-6 6 6-6 6",
  ariaHidden,
}: {
  /** Path override for the two non-default arrows (loop + down arrows). */
  d?: string;
  ariaHidden?: boolean;
}) {
  return (
    <svg
      className="arrow"
      viewBox="0 0 24 24"
      {...(ariaHidden ? { "aria-hidden": true } : {})}
    >
      <path d={d} />
    </svg>
  );
}
