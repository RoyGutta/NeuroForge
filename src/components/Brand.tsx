import { Link } from "react-router-dom";

/** The neuroforge wordmark + logo. Header usage carries the aria-label; the
 *  footers omit it — exactly as in the legacy pages. */
export function Brand({ ariaLabel }: { ariaLabel?: string }) {
  return (
    <Link className="brand" to="/" {...(ariaLabel ? { "aria-label": ariaLabel } : {})}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M4 25V7l12 18V7l12 18V7M4 7l12-4 12 4M4 25l12 4 12-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      neuroforge
    </Link>
  );
}
