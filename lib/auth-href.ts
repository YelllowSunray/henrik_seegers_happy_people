/** Shared auth destinations — use with next-intl `Link` / `router`. */

export type AuthHref = {
  pathname: "/join" | "/auth";
  query?: { next?: string; mode?: string };
};

/** Create-account flow after a membership CTA. */
export function joinHref(next = "/members/onboarding"): AuthHref {
  return {
    pathname: "/join",
    query: { next },
  };
}

/** Existing members signing back in. */
export function signInHref(next?: string): AuthHref {
  return next
    ? { pathname: "/auth", query: { next } }
    : { pathname: "/auth" };
}
