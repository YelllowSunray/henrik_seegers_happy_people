"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { computeTrialEndsAt, hasMembershipAccess } from "@/lib/membership";
import type { MemberProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: MemberProfile | null;
  loading: boolean;
  isMember: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<MemberProfile> {
  const db = getClientDb();
  const ref = doc(db, "members", user.uid);
  const snap = await getDoc(ref);
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emailAdmin = adminEmails.includes((user.email ?? "").toLowerCase());

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
    // Backfill complimentary week for accounts created before app trials.
    if (
      !next.isAdmin &&
      !next.stripeSubscriptionId &&
      !next.trialEndsAt &&
      next.onboardingCompleted
    ) {
      const trialEndsAt = computeTrialEndsAt();
      await setDoc(
        ref,
        { subscriptionStatus: "trialing", trialEndsAt },
        { merge: true },
      );
      return { ...next, subscriptionStatus: "trialing", trialEndsAt };
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isMember: hasMembershipAccess(profile),
      isAdmin: Boolean(profile?.isAdmin),
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(getClientAuth(), email, password);
      },
      signUp: async (email, password) => {
        const cred = await createUserWithEmailAndPassword(
          getClientAuth(),
          email,
          password,
        );
        await setDoc(doc(getClientDb(), "members", cred.user.uid), {
          uid: cred.user.uid,
          email,
          subscriptionStatus: "trialing",
          trialEndsAt: computeTrialEndsAt(),
          isAdmin: false,
        } satisfies MemberProfile);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(getClientAuth(), email.trim());
      },
      signOut: async () => {
        await firebaseSignOut(getClientAuth());
      },
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
