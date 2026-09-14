import { useEffect } from "react";

/** Sets document.title and the meta description, exactly as each legacy page's
 *  <head> did. Runs per route so SPA navigation keeps head metadata in sync. */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;
    if (description !== undefined) {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
