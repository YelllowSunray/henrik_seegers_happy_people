import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { readFileSync } from "fs";
import { join } from "path";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Record<string, unknown>;

  return {
    locale,
    messages,
  };
});
