import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_HREF, WHATSAPP_DISPLAY, WHATSAPP_HREF } from "@/lib/contact";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg-deep pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-display text-2xl text-ink">Happy People</p>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">{t("tagline")}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-soft">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
          >
            WhatsApp · {WHATSAPP_DISPLAY}
          </a>
          <a
            href={FACEBOOK_HREF}
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
          >
            Facebook — Henrik Seegers
          </a>
          <Link href="/contact" className="hover:text-accent">
            Contact
          </Link>
          <p>{t("rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
