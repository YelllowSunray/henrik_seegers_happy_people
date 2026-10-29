import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/components/auth-provider";
import { BillingBanner } from "@/components/billing-banner";
import { CmsProvider } from "@/components/cms/cms-provider";
import { LocaleHtmlAttrs } from "@/components/locale-html-attrs";
import { NavigationMemory } from "@/components/navigation-memory";
import { MusicRoutePersistence } from "@/components/music-route-persistence";
import { SmartBackButton } from "@/components/smart-back-button";
import { SiteFooter } from "@/components/site-footer";
import { ClubChatFab } from "@/components/club-chat-fab";
import { rtlLocales, type Locale } from "@/i18n/locales";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = rtlLocales.has(locale as Locale) ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleHtmlAttrs locale={locale} />
      <AuthProvider>
        <NavigationMemory>
          <CmsProvider>
            <MusicRoutePersistence />
            <div
              className="flex min-h-full min-w-0 max-w-[100vw] flex-col overflow-x-clip"
              dir={dir}
              lang={locale}
            >
              <BillingBanner />
              <div className="min-w-0 flex-1 pb-[max(8rem,var(--cms-dock-h,7rem))] md:pb-28">
                {children}
              </div>
              <SiteFooter locale={locale} />
            </div>
            <SmartBackButton />
            <ClubChatFab />
          </CmsProvider>
        </NavigationMemory>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
