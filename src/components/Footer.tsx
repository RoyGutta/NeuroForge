import { Link } from "react-router-dom";
import type { PageId } from "./NavBar";

interface FooterLink {
  label: string;
  to: string;
  page: PageId;
}

/** Each legacy page's footer lists a DIFFERENT set of links; the caller passes
 *  its exact set, and the current page gets aria-current, as in the originals. */
export function Footer({
  links,
  current,
}: {
  links: FooterLink[];
  current: PageId;
}) {
  return (
    <footer>
      {/* Legacy footers link the wordmark WITHOUT the logo svg — text only. */}
      <Link className="brand" to="/">
        neuroforge
      </Link>
      <span>Engineering, evolved. © 2026 NeuroForge</span>
      <div>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            {...(l.page === current ? { "aria-current": "page" as const } : {})}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
