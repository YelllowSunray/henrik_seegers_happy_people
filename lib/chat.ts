import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { ChatSenderRole, MemberProfile } from "@/lib/types";

export async function ensureChatThread(
  db: Firestore,
  member: Pick<
    MemberProfile,
    "uid" | "email" | "displayName" | "photoURL"
  >,
) {
  const ref = doc(db, "chats", member.uid);
  await setDoc(
    ref,
    {
      memberUid: member.uid,
      memberEmail: member.email,
      ...(member.displayName ? { memberName: member.displayName } : {}),
      ...(member.photoURL ? { memberPhotoURL: member.photoURL } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return ref;
}

export async function sendChatMessage(
  db: Firestore,
  memberUid: string,
  input: {
    text: string;
    senderId: string;
    senderRole: ChatSenderRole;
    member?: Pick<
      MemberProfile,
      "uid" | "email" | "displayName" | "photoURL"
    >;
  },
) {
  const text = input.text.trim();
  if (!text) return;

  if (input.member) {
    await ensureChatThread(db, input.member);
  } else {
    await setDoc(
      doc(db, "chats", memberUid),
      { updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  await addDoc(collection(db, "chats", memberUid, "messages"), {
    text,
    senderId: input.senderId,
    senderRole: input.senderRole,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", memberUid),
    {
      lastMessage: text.slice(0, 240),
      lastMessageAt: serverTimestamp(),
      lastSenderRole: input.senderRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markChatRead(
  db: Firestore,
  memberUid: string,
  role: ChatSenderRole,
) {
  const field = role === "admin" ? "adminLastReadAt" : "memberLastReadAt";
  await setDoc(
    doc(db, "chats", memberUid),
    { [field]: serverTimestamp() },
    { merge: true },
  );
}

export function timestampToMs(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === "string" && value) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (typeof value === "number") return value;
  return 0;
}

export function formatChatTime(value: unknown): string {
  const ms = timestampToMs(value);
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}
