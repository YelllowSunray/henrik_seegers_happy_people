import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/components/auth-provider";
import { BillingBanner } from "@/components/billing-banner";
import { LocaleHtmlAttrs } from "@/components/locale-html-attrs";
import { NavigationMemory } from "@/components/navigation-memory";
import { SmartBackButton } from "@/components/smart-back-button";
import { SiteFooter } from "@/components/site-footer";
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
          <div className="flex min-h-full flex-col" dir={dir} lang={locale}>
            <BillingBanner />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
          <SmartBackButton />
        </NavigationMemory>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
