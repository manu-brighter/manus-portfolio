import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// If you need server-side redirect, the static-export target precludes it.
// Use a client-side router push or rethink the route.
export const { Link, usePathname, useRouter } = createNavigation(routing);
