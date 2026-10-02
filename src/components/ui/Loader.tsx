"use client";

import { useEffect } from "react";
import { markLoaderComplete } from "@/lib/loaderSession";

export { isLoaderComplete } from "@/lib/loaderSession";

/** Release reveals and renderers on mount without a painted startup overlay. */
export function Loader() {
  useEffect(() => {
    markLoaderComplete();
  }, []);

  return null;
}
