import { getTranslations } from "next-intl/server";
import { CmsField } from "@/components/cms/cms-field";
import { FACEBOOK_HREF } from "@/lib/contact";
import { cmsText } from "@/lib/homepage-content";
import { fetchHomepageCmsForLocale } from "@/lib/homepage-content.server";

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();
  const cms = await fetchHomepageCmsForLocale(locale);
  const tagline = cmsText(cms?.footer.tagline, t("tagline"));
  const facebook = cmsText(
    cms?.footer.facebook,
    "Facebook — Hendrik Seegers",
  );

  return (
    <footer className="border-t border-line bg-bg-deep pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-display text-2xl text-ink">Happy People</p>
          <CmsField
            path="footer.tagline"
            value={tagline}
            className="mt-2 max-w-sm text-sm text-ink-soft"
          />
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-soft">
          <a
            href={FACEBOOK_HREF}
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
          >
            <CmsField
              path="footer.facebook"
              value={facebook}
              multiline={false}
              inline
              className="text-sm text-ink-soft"
            />
          </a>
          <p>{t("rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
