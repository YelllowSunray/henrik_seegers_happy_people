"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "@/i18n/navigation";
import {
  queueScrollRestore,
  takeAdminReturn,
} from "@/components/navigation-memory";

export default function AdminPage() {
  const { enterAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    enterAdmin();
    const back = takeAdminReturn();
    if (back && (back.scrollY > 0 || back.sectionId)) {
      queueScrollRestore({
        path: "/",
        scrollY: back.scrollY,
        sectionId: back.sectionId,
      });
    }
    router.replace("/", { locale: "nl", scroll: false });
  }, [enterAdmin, router]);

  return (
    <>
      <SiteHeader variant="solid" />
      <p className="p-16 text-center text-ink-soft">Beheer openen…</p>
    </>
  );
}
