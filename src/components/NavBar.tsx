import { Link } from "react-router-dom";
import { Arrow } from "./Arrow";
import { Brand } from "./Brand";

export type PageId = "home" | "projects" | "technology" | "workspace";

/**
 * The main navigation, reproducing each legacy page's header exactly:
 *  - aria-current="page" on the active link (home marks none),
 *  - the workspace page's CTA carries aria-current and has NO arrow,
 *  - the technology page's CTA arrow is aria-hidden (others leave it bare).
 */
export function NavBar({ current }: { current: PageId }) {
  const cur = (page: PageId) =>
    current === page ? { "aria-current": "page" as const } : {};
  return (
    <header className="nav">
      <Brand ariaLabel="NeuroForge home" />
      <nav aria-label="Main navigation">
        <Link to="/technology" {...cur("technology")}>
          The engine
        </Link>
        <Link to="/projects" {...cur("projects")}>
          Explore projects
        </Link>
        <Link className="nav-cta" to="/workspace" {...cur("workspace")}>
          Open workspace
          {current !== "workspace" && (
            <>
              {" "}
              <Arrow ariaHidden={current === "technology"} />
            </>
          )}
        </Link>
      </nav>
    </header>
  );
}
