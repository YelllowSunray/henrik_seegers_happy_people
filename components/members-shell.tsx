"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { MembersGate } from "@/components/members-gate";
import { MembersNav } from "@/components/members-nav";
import { MembersAccountBar } from "@/components/members-account-bar";
import { ClubActivityProvider } from "@/components/club-activity-provider";
import { ClubChatFab } from "@/components/club-chat-fab";
import { needsOnboarding } from "@/lib/profile";

export function MembersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, isMember } = useAuth();
  const onOnboarding = pathname === "/members/onboarding";
  const onChat = pathname.startsWith("/members/chat");
  const showClubChrome = isMember && !onOnboarding;

  useEffect(() => {
    if (loading || !profile || profile.isAdmin) return;
    if (needsOnboarding(profile) && !onOnboarding) {
      router.replace("/members/onboarding");
    }
  }, [loading, profile, onOnboarding, router]);

  return (
    <MembersGate>
      {onOnboarding ? (
        <div>{children}</div>
      ) : needsOnboarding(profile) ? (
        <p className="py-16 text-center text-ink-soft">…</p>
      ) : (
        <ClubActivityProvider>
          {showClubChrome ? (
            <>
              <MembersAccountBar />
              <div className="mt-6">
                <MembersNav />
              </div>
              <div className="mt-10 pb-20">{children}</div>
              {!onChat && <ClubChatFab />}
            </>
          ) : (
            <div className="pb-20">
              <MembersAccountBar />
              <div className="mt-10">{children}</div>
            </div>
          )}
        </ClubActivityProvider>
      )}
    </MembersGate>
  );
}
