"use client";

import { useTranslations } from "next-intl";
import { VideoList } from "@/components/video-list";
import { getVideosByKind } from "@/lib/content";

export default function MembersSeminarsPage() {
  const tr = useTranslations("members");
  return (
    <div>
      <h1 className="font-display text-3xl">{tr("seminars")}</h1>
      <div className="mt-6">
        <VideoList items={getVideosByKind("seminar")} />
      </div>
    </div>
  );
}
