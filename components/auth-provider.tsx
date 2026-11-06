"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
import {
  getClientAuth,
  getClientDb,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import {
  ADMIN_PASSWORD,
  ADMIN_SESSION_KEY,
} from "@/lib/admin-gate";
import {
  isAllowlistedAdminEmail,
  normalizeEmail,
} from "@/lib/admin-emails";
import {
  readAdminPreview,
  subscribeAdminPreview,
  writeAdminPreview,
  type AdminPreviewMode,
} from "@/lib/admin-preview";
import { hasMembershipAccess } from "@/lib/membership";
import type { MemberProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: MemberProfile | null;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  /** True admin identity — ignores the view-only preview switch. */
  isRealAdmin: boolean;
  previewMode: AdminPreviewMode;
  setPreviewMode: (mode: AdminPreviewMode) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Open the CMS without a password. Used by /admin. */
  enterAdmin: () => void;
  unlockAdmin: (password: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<MemberProfile> {
  const db = getClientDb();
  const ref = doc(db, "members", user.uid);
  const snap = await getDoc(ref);
  const emailAdmin = isAllowlistedAdminEmail(user.email);

  if (snap.exists()) {
    const data = snap.data() as MemberProfile;
    const next = { ...data, isAdmin: emailAdmin || Boolean(data.isAdmin) };
    if (emailAdmin && !data.isAdmin) {
      await setDoc(ref, { isAdmin: true }, { merge: true });
    }
    // Plan is only real after Stripe confirms — clear abandoned-checkout leftovers.
    if (!next.stripeSubscriptionId && next.membershipPlan) {
      await setDoc(ref, { membershipPlan: deleteField() }, { merge: true });
      delete next.membershipPlan;
    }
    return next;
  }
  const profile: MemberProfile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? undefined,
    subscriptionStatus: "none",
    isAdmin: emailAdmin,
  };
  await setDoc(ref, profile);
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Always start false so SSR + first client paint match (avoids hydration mismatch).
  const [passwordAdmin, setPasswordAdmin] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
        setPasswordAdmin(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user || !isFirebaseConfigured) return;
    const next = await loadProfile(user);
    setProfile(next);
  }, [user]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (next) {
        try {
          setProfile(await loadProfile(next));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const previewMode = useSyncExternalStore(
    subscribeAdminPreview,
    readAdminPreview,
    () => "off" as const,
  );

  const setPreviewMode = useCallback((mode: AdminPreviewMode) => {
    writeAdminPreview(mode);
  }, []);

  const enterAdmin = useCallback(() => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setPasswordAdmin(true);
    writeAdminPreview("off");
  }, []);

  const unlockAdmin = useCallback(
    (password: string) => {
      if (password !== ADMIN_PASSWORD) return false;
      enterAdmin();
      return true;
    },
    [enterAdmin],
  );

  const isRealAdmin = Boolean(profile?.isAdmin) || passwordAdmin;
  const viewingAs = isRealAdmin ? previewMode : "off";
  const previewProfile: MemberProfile | null =
    viewingAs === "visitor"
      ? null
      : viewingAs === "member"
        ? {
            uid: user?.uid || profile?.uid || "preview-lid",
            email: user?.email || profile?.email || "lid@happypeople",
            displayName: profile?.displayName || "Happy People",
            subscriptionStatus: "active",
            stripeSubscriptionId: profile?.stripeSubscriptionId || "preview-lid",
            membershipPlan: profile?.membershipPlan || "monthly",
            onboardingCompleted: true,
            isAdmin: false,
          }
        : profile;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: viewingAs === "visitor" ? null : user,
      profile: previewProfile,
      loading,
      isMember:
        viewingAs === "member"
          ? true
          : viewingAs === "visitor"
            ? false
            : hasMembershipAccess(profile),
      isAdmin: viewingAs === "off" && isRealAdmin,
      isRealAdmin,
      previewMode: viewingAs,
      setPreviewMode,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(
          getClientAuth(),
          normalizeEmail(email),
          password,
        );
      },
      signUp: async (email, password) => {
        const normalized = normalizeEmail(email);
        const cred = await createUserWithEmailAndPassword(
          getClientAuth(),
          normalized,
          password,
        );
        await setDoc(doc(getClientDb(), "members", cred.user.uid), {
          uid: cred.user.uid,
          email: normalized,
          subscriptionStatus: "none",
          isAdmin: isAllowlistedAdminEmail(normalized),
        } satisfies MemberProfile);
      },
      resetPassword: async (email) => {
        const auth = getClientAuth();
        const normalized = normalizeEmail(email);
        if (typeof window !== "undefined") {
          await sendPasswordResetEmail(auth, normalized, {
            url: `${window.location.origin}/nl/auth`,
            handleCodeInApp: false,
          });
          return;
        }
        await sendPasswordResetEmail(auth, normalized);
      },
      signOut: async () => {
        try {
          sessionStorage.removeItem(ADMIN_SESSION_KEY);
        } catch {
          /* ignore */
        }
        writeAdminPreview("off");
        setPasswordAdmin(false);
        if (user) await firebaseSignOut(getClientAuth());
      },
      refreshProfile,
      enterAdmin,
      unlockAdmin,
    }),
    [
      user,
      profile,
      previewProfile,
      loading,
      isRealAdmin,
      viewingAs,
      setPreviewMode,
      refreshProfile,
      enterAdmin,
      unlockAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
