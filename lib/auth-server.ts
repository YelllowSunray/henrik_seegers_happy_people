import { getAdminAuth, isAdminEmail } from "@/lib/firebase/admin";

export async function verifyBearerUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length);
  const auth = getAdminAuth();
  if (!auth) {
    return null;
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      isAdmin: isAdminEmail(decoded.email),
    };
  } catch {
    return null;
  }
}
