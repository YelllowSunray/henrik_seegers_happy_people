export type RecorderFormat = {
  mimeType: string;
  extension: "mp4" | "webm";
};

const CANDIDATES: RecorderFormat[] = [
  { mimeType: "video/mp4;codecs=h264,aac", extension: "mp4" },
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

/** Prefer mp4 (iPhone Safari). Fall back to webm on desktop Chrome. */
export function pickRecorderFormat(): RecorderFormat {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", extension: "webm" };
  }
  for (const candidate of CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return { mimeType: "", extension: "webm" };
}

export function recorderExtensionFromType(type: string): "mp4" | "webm" {
  return type.includes("mp4") ? "mp4" : "webm";
}

export function canUseMediaRecorder(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** ~2.1 Mbps → ~16 MB/min. Storage rules cap uploads at 80 MB. */
export const MAX_RECORD_MS = 4 * 60 * 1000;
