import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import { extensionFromVideoBlob } from "@/lib/media-record";

export async function uploadVlogBlob(
  uid: string,
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is niet ingesteld. Vraag Samir om de site te configureren.");
  }
  const type = blob.type || "video/mp4";
  const ext = extensionFromVideoBlob(blob);
  const path = `club-media/vlogs/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(getClientStorage(), path);
  const task = uploadBytesResumable(storageRef, blob, { contentType: type });
  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      reject,
      () => resolve(),
    );
  });
  return getDownloadURL(task.snapshot.ref);
}
