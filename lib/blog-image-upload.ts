import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import { compressImageFile } from "@/lib/image-compress";

export type BlogImageKind = "cover" | "inline";

function dutchStorageError(err: unknown): Error {
  const message = err instanceof Error ? err.message : "";
  if (/storage\/unauthorized|permission/i.test(message)) {
    return new Error(
      "Geen toestemming om te uploaden. Log in met je Happy People-e-mail (Henk).",
    );
  }
  if (/storage\/canceled/i.test(message)) {
    return new Error("Uploaden geannuleerd.");
  }
  if (/storage\/retry-limit/i.test(message)) {
    return new Error("De verbinding viel weg. Probeer de foto opnieuw.");
  }
  return err instanceof Error
    ? err
    : new Error("Uploaden mislukt. Probeer het opnieuw.");
}

export async function uploadBlogImage(
  uid: string,
  file: File,
  kind: BlogImageKind,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is niet ingesteld. Vraag Samir om de site te configureren.",
    );
  }

  onProgress?.(8);
  const blob = await compressImageFile(file, {
    maxEdge: kind === "cover" ? 1920 : 1600,
  });
  onProgress?.(18);

  const path = `club-media/blog/${uid}/${kind}-${Date.now()}.jpg`;
  const storageRef = ref(getClientStorage(), path);
  const task = uploadBytesResumable(storageRef, blob, {
    contentType: "image/jpeg",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          const raw = Math.round(
            (snap.bytesTransferred / snap.totalBytes) * 80,
          );
          onProgress?.(18 + raw);
        }
      },
      (err) => reject(dutchStorageError(err)),
      () => resolve(),
    );
  });

  onProgress?.(100);
  return getDownloadURL(task.snapshot.ref);
}
