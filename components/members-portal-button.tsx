"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";

/** Link to the subscription page — admins see different copy. */
export function MembersPortalButton() {
  const tr = useTranslations("members");
  const { isAdmin } = useAuth();

  return (
    <Link
      href="/members/subscription"
      className="text-sm text-ink-soft underline-offset-4 hover:text-accent hover:underline"
    >
      {isAdmin ? tr("adminAccessLink") : tr("manageBilling")}
    </Link>
  );
}
