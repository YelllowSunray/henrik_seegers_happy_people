import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileForm } from "@/components/profile-form";

export default async function MembersProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("lead")}</p>
      <div className="mt-10">
        <ProfileForm mode="profile" />
      </div>
    </div>
  );
}
