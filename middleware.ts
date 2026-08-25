import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(nl|en|de|es|it|fr|ko|ru|zh|ar)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
