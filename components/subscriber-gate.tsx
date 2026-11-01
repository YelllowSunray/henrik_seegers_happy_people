"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { MembershipPlans } from "@/components/membership-plans";
import { signInHref } from "@/lib/auth-href";

function pageLabel(
  pathname: string,
  tNav: (key: "videoBell" | "seminars" | "vlogs" | "blog" | "community") => string,
): string {
  if (pathname.startsWith("/video-bell")) return tNav("videoBell");
  if (pathname.startsWith("/seminars")) return tNav("seminars");
  if (pathname.startsWith("/vlogs")) return tNav("vlogs");
  if (pathname.startsWith("/blog")) return tNav("blog");
  if (pathname.startsWith("/community")) return tNav("community");
  return tNav("blog");
}

function SubscriberGateInner({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations("members");
  const tSub = useTranslations("subscription");
  const tNav = useTranslations("nav");
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);

  useEffect(() => {
    if (search.get("checkout") !== "cancel") return;
    setCheckoutCancelled(true);
    router.replace(pathname, { scroll: false });
  }, [search, pathname, router]);

  if (loading) {
    return <p className="py-20 text-center text-ink-soft">…</p>;
  }

  if (isMember || isAdmin) {
    return <>{children}</>;
  }

  const label = pageLabel(pathname || "/", tNav);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="text-center">
        <p className="font-display text-3xl text-ink sm:text-4xl">{label}</p>
        <p className="mt-3 text-ink-soft">{t("locked")}</p>
        {!user && (
          <Link
            href={signInHref(pathname || "/")}
            className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
          >
            {tNav("signIn")}
          </Link>
        )}
      </div>
      {checkoutCancelled && (
        <p className="mt-6 border border-line bg-bg-deep/50 px-4 py-3 text-center text-sm text-ink-soft">
          {tSub("checkoutCancel")}
        </p>
      )}
      <MembershipPlans className="mt-10" cancelPath={pathname} />
    </div>
  );
}

/** Nav destinations stay closed unless the visitor is a subscribed member. */
export function SubscriberGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">…</p>}>
      <SubscriberGateInner>{children}</SubscriberGateInner>
    </Suspense>
  );
}
