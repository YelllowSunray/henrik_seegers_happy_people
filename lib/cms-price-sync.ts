import type { HomepageContent } from "@/lib/homepage-content";

const EURO_RE = /€\s*(\d+(?:[.,]\d+)?)/g;

export function extractEuroAmounts(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(EURO_RE)) {
    const n = Number(String(match[1]).replace(",", "."));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function formatEuro(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(amount);
}

/** Replace €20 / € 20 / 20 euro occurrences of a known amount. */
export function replaceEuroAmount(
  text: string,
  from: number,
  to: number,
): string {
  if (from === to) return text;
  const fromStr = formatEuro(from);
  const toStr = formatEuro(to);
  // Avoid replacing a yearly 200 when syncing monthly 20 → need word boundaries.
  // Match €optional-space + amount not followed by more digits.
  const euroPat = new RegExp(`(€\\s*)${escapeRe(fromStr)}(?!\\d)`, "g");
  let next = text.replace(euroPat, `$1${toStr}`);
  const wordPat = new RegExp(
    `\\b${escapeRe(fromStr)}(\\s*euro)\\b`,
    "gi",
  );
  next = next.replace(wordPat, `${toStr}$1`);
  return next;
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walkStrings(
  value: unknown,
  map: (s: string) => string,
): unknown {
  if (typeof value === "string") return map(value);
  if (Array.isArray(value)) return value.map((item) => walkStrings(item, map));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walkStrings(v, map);
    }
    return out;
  }
  return value;
}

function readMembershipAmounts(m: HomepageContent["membership"]): {
  monthly: number | null;
  yearly: number | null;
} {
  const monthlyCandidates = [
    ...extractEuroAmounts(m.priceMonthly),
    ...extractEuroAmounts(m.monthlyPlanTitle),
    ...extractEuroAmounts(m.price),
  ];
  const yearlyCandidates = [
    ...extractEuroAmounts(m.priceYearly),
    ...extractEuroAmounts(m.yearlyPlanTitle),
  ];
  // Prefer smaller unique monthly vs yearly: if both 20 and 200 present in noObligation, pick from dedicated fields first.
  return {
    monthly: monthlyCandidates[0] ?? null,
    yearly: yearlyCandidates[0] ?? null,
  };
}

function inferChangedAmount(
  before: string,
  after: string,
  knownMonthly: number | null,
  knownYearly: number | null,
): { kind: "monthly" | "yearly"; from: number; to: number } | null {
  const oldAmts = extractEuroAmounts(before);
  const newAmts = extractEuroAmounts(after);
  if (newAmts.length === 0) return null;

  // Single-amount field: whatever changed is the signal.
  if (oldAmts.length <= 1 && newAmts.length === 1) {
    const from = oldAmts[0];
    const to = newAmts[0]!;
    if (from == null) {
      // Newly introduced amount — guess kind from surrounding words / known values.
      const kind = guessKind(after, to, knownMonthly, knownYearly);
      if (!kind || knownMonthly == null && kind === "monthly") {
        return kind === "monthly" || kind === "yearly"
          ? { kind, from: kind === "monthly" ? (knownMonthly ?? to) : (knownYearly ?? to), to }
          : null;
      }
      const prev =
        kind === "monthly" ? knownMonthly : knownYearly;
      if (prev == null || prev === to) return null;
      return { kind, from: prev, to };
    }
    if (from === to) return null;
    const kind = guessKind(after, to, knownMonthly, knownYearly, from);
    return kind ? { kind, from, to } : null;
  }

  // Multi-amount (e.g. noObligation): find which known amount was replaced.
  if (knownMonthly != null && newAmts.includes(knownMonthly) === false) {
    const replacement = newAmts.find((n) => n !== knownYearly);
    if (replacement != null && replacement !== knownMonthly) {
      return { kind: "monthly", from: knownMonthly, to: replacement };
    }
  }
  if (knownYearly != null && newAmts.includes(knownYearly) === false) {
    const replacement = newAmts.find((n) => n !== knownMonthly);
    if (replacement != null && replacement !== knownYearly) {
      return { kind: "yearly", from: knownYearly, to: replacement };
    }
  }

  // Pairwise: first differing slot.
  const len = Math.min(oldAmts.length, newAmts.length);
  for (let i = 0; i < len; i++) {
    if (oldAmts[i] !== newAmts[i]) {
      const from = oldAmts[i]!;
      const to = newAmts[i]!;
      const kind = guessKind(after, to, knownMonthly, knownYearly, from);
      return kind ? { kind, from, to } : null;
    }
  }
  return null;
}

function guessKind(
  text: string,
  amount: number,
  knownMonthly: number | null,
  knownYearly: number | null,
  from?: number,
): "monthly" | "yearly" | null {
  if (from != null) {
    if (knownMonthly != null && from === knownMonthly) return "monthly";
    if (knownYearly != null && from === knownYearly) return "yearly";
  }
  if (knownMonthly != null && amount === knownMonthly) return "monthly";
  if (knownYearly != null && amount === knownYearly) return "yearly";
  if (/maand/i.test(text) && !/jaar/i.test(text)) return "monthly";
  if (/jaar/i.test(text) && !/maand/i.test(text)) return "yearly";
  if (/maand/i.test(text) && knownMonthly != null && from === knownMonthly) {
    return "monthly";
  }
  if (/jaar/i.test(text) && knownYearly != null && from === knownYearly) {
    return "yearly";
  }
  // Heuristic: yearly is usually ~10x monthly.
  if (knownMonthly != null && amount >= knownMonthly * 8) return "yearly";
  if (knownYearly != null && amount <= knownYearly / 8) return "monthly";
  if (/maand/i.test(text)) return "monthly";
  if (/jaar/i.test(text)) return "yearly";
  return null;
}

function rebuildDisplayPrices(
  m: HomepageContent["membership"],
  monthly: number,
  yearly: number,
): HomepageContent["membership"] {
  const mStr = formatEuro(monthly);
  const yStr = formatEuro(yearly);
  const monthsSaved = Math.max(
    0,
    Math.round((monthly * 12 - yearly) / monthly),
  );

  return {
    ...m,
    price: `€${mStr} / maand`,
    priceMonthly: `€${mStr} / maand`,
    priceYearly: `€${yStr} / jaar`,
    monthlyDetail: `€${mStr} per maand.`,
    yearlyDetail: `€${yStr} per jaar.`,
    yearlySave:
      monthsSaved > 0
        ? `${monthsSaved} maand${monthsSaved === 1 ? "" : "en"} voordeel`
        : m.yearlySave,
    // Keep free-form titles in sync for the € amount only (already walked),
    // but ensure defaults still look right if title had no euro yet:
    monthlyPlanTitle: /€/.test(m.monthlyPlanTitle)
      ? m.monthlyPlanTitle
      : `Happy People — €${mStr} per maand`,
    yearlyPlanTitle: /€/.test(m.yearlyPlanTitle)
      ? m.yearlyPlanTitle
      : `Happy People — €${yStr} per jaar`,
  };
}

/**
 * After a membership text edit, propagate euro amount changes across all
 * membership copy (plan titles, big Maandelijks/Jaarlijks prices, etc.).
 */
export function syncMembershipPrices(
  prev: HomepageContent,
  next: HomepageContent,
  path: string,
): HomepageContent {
  if (!path.startsWith("membership.")) return next;

  const beforeRaw = path
    .split(".")
    .slice(1)
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, prev.membership);

  const afterRaw = path
    .split(".")
    .slice(1)
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, next.membership);

  // Editing a list item: path like membership.monthlyBenefits.0
  const before =
    typeof beforeRaw === "string"
      ? beforeRaw
      : typeof afterRaw === "string"
        ? ""
        : null;
  const after = typeof afterRaw === "string" ? afterRaw : null;
  if (before == null || after == null) return next;

  const known = readMembershipAmounts(prev.membership);
  const change = inferChangedAmount(
    before,
    after,
    known.monthly,
    known.yearly,
  );
  if (!change) return next;

  const monthly =
    change.kind === "monthly" ? change.to : (known.monthly ?? change.to);
  const yearly =
    change.kind === "yearly" ? change.to : (known.yearly ?? change.to);

  // Replace the changed amount everywhere under membership.
  let membership = walkStrings(next.membership, (s) =>
    replaceEuroAmount(s, change.from, change.to),
  ) as HomepageContent["membership"];

  // Normalize dedicated display fields from the resolved amounts.
  membership = rebuildDisplayPrices(membership, monthly, yearly);

  // Keep the no-obligation lead in sync when both amounts are known.
  if (monthly != null && yearly != null) {
    const mStr = formatEuro(monthly);
    const yStr = formatEuro(yearly);
    const rest = membership.noObligation
      .replace(
        /^€?\s*\d+(?:[.,]\d+)?\s*(?:per\s+)?maand\s+of\s+€?\s*\d+(?:[.,]\d+)?\s*(?:per\s+)?jaar\.?\s*/i,
        "",
      )
      .trim();
    membership = {
      ...membership,
      noObligation: rest
        ? `€${mStr} per maand of €${yStr} per jaar. ${rest}`
        : `€${mStr} per maand of €${yStr} per jaar.`,
    };
  }

  return { ...next, membership };
}
