"use client";

import { CmsField } from "@/components/cms/cms-field";
import { useCmsOptional, useCmsValue } from "@/components/cms/cms-provider";

export function ZoomMeetingJoin({
  url,
  joinLabel,
  missingLabel,
}: {
  url: string;
  joinLabel: string;
  missingLabel: string;
}) {
  const cms = useCmsOptional();
  const liveUrl = useCmsValue("zoom.url", url);
  const href = (cms?.enabled ? liveUrl : url).trim();

  return (
    <div>
      <CmsField
        path="zoom.url"
        value={url}
        multiline={false}
        label="Zoom-link"
        placeholder="https://zoom.us/j/…"
        cmsOnly
        className="mb-4 max-w-xl text-sm text-ink"
      />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          <CmsField
            path="zoom.join"
            value={joinLabel}
            as="span"
            multiline={false}
            inline
            className="bg-transparent text-sm font-semibold text-white"
          />
        </a>
      ) : (
        <CmsField
          path="zoom.missing"
          value={missingLabel}
          className="max-w-xl rounded-xl border border-line bg-white/60 px-4 py-3 text-sm text-ink-soft"
        />
      )}
    </div>
  );
}
