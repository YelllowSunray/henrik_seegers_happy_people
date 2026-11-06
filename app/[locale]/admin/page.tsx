"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "@/i18n/navigation";

export default function AdminPage() {
  const { enterAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    enterAdmin();
    router.replace("/");
  }, [enterAdmin, router]);

  return (
    <>
      <SiteHeader variant="solid" />
      <p className="p-16 text-center text-ink-soft">Beheer openen…</p>
    </>
  );
}
