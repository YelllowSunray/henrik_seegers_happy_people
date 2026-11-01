/**
 * Contract check for YouTube-vlog create:
 * - parse watch / youtu.be / shorts
 * - never treat a response as saved unless ok + video.id
 * - Dutch "niet opgeslagen" on 401/503
 * Optional HTTP against CHECK_YOUTUBE_VLOG_URL or http://127.0.0.1:3000
 *
 *   node --experimental-strip-types scripts/check-youtube-vlog-create.mjs
 */
import {
  adminSaveError,
  isAdminCreateSuccess,
  readAdminJson,
} from "../lib/admin-save.ts";
import {
  youtubeIdFromUrl,
  youtubeThumbSrc,
  youtubeWatchUrl,
} from "../lib/youtube.ts";

const SAMPLE_ID = "dQw4w9WgXcQ";
let failed = 0;

function assert(name, ok, detail = "") {
  if (ok) {
    console.log(`ok  ${name}`);
    return;
  }
  failed += 1;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fakeRes(status, body) {
  return new Response(body, { status });
}

assert(
  "watch URL",
  youtubeIdFromUrl(`https://www.youtube.com/watch?v=${SAMPLE_ID}`) === SAMPLE_ID,
);
assert(
  "youtu.be URL",
  youtubeIdFromUrl(`https://youtu.be/${SAMPLE_ID}`) === SAMPLE_ID,
);
assert(
  "shorts URL",
  youtubeIdFromUrl(`https://www.youtube.com/shorts/${SAMPLE_ID}`) === SAMPLE_ID,
);
assert(
  "normalize to watch",
  youtubeWatchUrl(SAMPLE_ID) === `https://www.youtube.com/watch?v=${SAMPLE_ID}`,
);
assert(
  "thumbnail",
  youtubeThumbSrc(SAMPLE_ID) ===
    `https://i.ytimg.com/vi/${SAMPLE_ID}/hqdefault.jpg`,
);
assert("reject junk", youtubeIdFromUrl("https://example.com") === null);

const okRes = fakeRes(200, "");
assert(
  "200 + ok + id is success",
  isAdminCreateSuccess(okRes, { ok: true, video: { id: "abc" } }, "vlog"),
);
assert(
  "200 without id is not success",
  !isAdminCreateSuccess(okRes, { ok: true, video: {} }, "vlog"),
);
assert(
  "200 without ok is not success",
  !isAdminCreateSuccess(okRes, { video: { id: "abc" } }, "vlog"),
);
assert(
  "empty body is not success",
  !isAdminCreateSuccess(okRes, {}, "vlog"),
);

const unauthorized = fakeRes(401, '{"error":"Unauthorized"}');
assert(
  "401 Dutch",
  adminSaveError(unauthorized, { error: "Unauthorized" }, "vlog").includes(
    "niet opgeslagen",
  ) &&
    adminSaveError(unauthorized, { error: "Unauthorized" }, "vlog").includes(
      "Niet gemachtigd",
    ),
);

const down = fakeRes(503, '{"error":"Firebase admin is not configured."}');
assert(
  "503 Dutch",
  adminSaveError(
    down,
    { error: "Firebase admin is not configured." },
    "vlog",
  ).includes("niet opgeslagen"),
);

const empty = await readAdminJson(fakeRes(200, ""));
assert("empty JSON is {}", !empty.ok && !empty.video && !empty.error);

const html = await readAdminJson(fakeRes(500, "<html>oops</html>"));
assert("HTML body is {}", !html.ok && !html.error);

async function httpContract() {
  const base = (
    process.env.CHECK_YOUTUBE_VLOG_URL || "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  const payload = {
    title: "Check YouTube-vlog (niet publiceren)",
    description: "Tijdelijke contract-check",
    videoUrl: `https://youtu.be/${SAMPLE_ID}`,
  };

  let probe;
  try {
    probe = await fetch(`${base}/api/admin/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.log(
      `skip HTTP (${base} not reachable: ${err instanceof Error ? err.message : err})`,
    );
    return;
  }

  const noAuth = await readAdminJson(probe);
  assert(
    "HTTP without password is 401",
    probe.status === 401,
    `status ${probe.status}`,
  );
  assert(
    "HTTP 401 is not success",
    !isAdminCreateSuccess(probe, noAuth, "vlog"),
  );
  assert(
    "HTTP 401 Dutch",
    `${noAuth.error ?? ""} ${adminSaveError(probe, noAuth, "vlog")}`.includes(
      "niet opgeslagen",
    ),
  );

  const authed = await fetch(`${base}/api/admin/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": "admin",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  const saved = await readAdminJson(authed);

  if (authed.status === 503) {
    assert(
      "HTTP 503 surfaces Dutch not-saved",
      adminSaveError(authed, saved, "vlog").includes("niet opgeslagen"),
    );
    assert(
      "HTTP 503 is not success",
      !isAdminCreateSuccess(authed, saved, "vlog"),
    );
    return;
  }

  const wrote = isAdminCreateSuccess(authed, saved, "vlog");
  assert(
    "HTTP create only succeeds with id",
    wrote,
    `status ${authed.status} body ${JSON.stringify(saved)}`,
  );

  if (wrote && saved.video?.id) {
    const del = await fetch(`${base}/api/admin/videos/${saved.video.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": "admin" },
      signal: AbortSignal.timeout(8000),
    });
    assert("HTTP cleanup DELETE", del.ok, `status ${del.status}`);
  }
}

await httpContract();

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nYouTube-vlog create contract ok");
