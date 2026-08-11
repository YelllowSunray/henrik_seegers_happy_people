import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import {
  getAdminAuth,
  getAdminDb,
  isAdminEmail,
} from "@/lib/firebase/admin";

/**
 * Developer cleanup: wipe a test member (Auth + Firestore profile + related data).
 * Requires ADMIN_EMAILS. Never deletes admins or the caller.
 */
export async function POST(req: Request) {
  const caller = await verifyBearerUser(req.headers.get("authorization"));
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!caller.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json(
      { error: "Firebase Admin not configured." },
      { status: 503 },
    );
  }

  let uid = "";
  try {
    const body = (await req.json()) as { uid?: unknown };
    uid = typeof body.uid === "string" ? body.uid.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!uid) {
    return NextResponse.json({ error: "uid is required." }, { status: 400 });
  }
  if (uid === caller.uid) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 403 },
    );
  }

  const memberRef = db.collection("members").doc(uid);
  const memberSnap = await memberRef.get();
  const memberData = memberSnap.data();
  const targetEmail =
    typeof memberData?.email === "string" ? memberData.email : "";

  if (memberData?.isAdmin === true || isAdminEmail(targetEmail)) {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted." },
      { status: 403 },
    );
  }

  try {
    const chatRef = db.collection("chats").doc(uid);
    if ((await chatRef.get()).exists) {
      await db.recursiveDelete(chatRef);
    }

    const byUid = await db
      .collection("personalMessages")
      .where("toUserId", "==", uid)
      .get();
    const byEmail = targetEmail
      ? await db
          .collection("personalMessages")
          .where("toEmail", "==", targetEmail.toLowerCase())
          .get()
      : null;

    const messageIds = new Set<string>();
    const docs = [...byUid.docs, ...(byEmail?.docs ?? [])].filter((d) => {
      if (messageIds.has(d.id)) return false;
      messageIds.add(d.id);
      return true;
    });
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = db.batch();
      for (const d of chunk) batch.delete(d.ref);
      await batch.commit();
    }

    if (memberSnap.exists) {
      await memberRef.delete();
    }

    try {
      await auth.deleteUser(uid);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code !== "auth/user-not-found") throw err;
    }

    return NextResponse.json({
      ok: true,
      uid,
      email: targetEmail || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
