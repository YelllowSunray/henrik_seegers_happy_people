"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function DonateThanksBanner({ show }: { show: boolean }) {
  const t = useTranslations("donate");
  const [visible, setVisible] = useState(show);

  if (!visible) return null;

  return (
    <div className="border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">
      {t("thanks")}
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-3 font-semibold text-accent hover:underline"
      >
        OK
      </button>
    </div>
  );
}
