/**
 * Stxic AI chat actions — natural-language intents that create real items.
 *
 * `parseAiAction` is pure and unit-tested; the chat page performs the actual
 * hydrate writes. Non-action text returns `null` and is handled by the normal
 * model chat.
 */

import type { AccountKind, Currency, TaskPriority } from "@/types";

const DAY_MS = 86_400_000;

export type AiAction =
  | { kind: "task"; title: string; priority: TaskPriority; dueDate?: number; description: string }
  | {
      kind: "income";
      label: string;
      amount: number;
      category: string;
      currency: Currency;
    }
  | {
      kind: "expense";
      label: string;
      amount: number;
      category: string;
      currency: Currency;
    }
  | { kind: "note"; title: string; content: string }
  | {
      kind: "savingsGoal";
      name: string;
      target: number;
      saved: number;
      currency: Currency;
      deadline?: number;
    }
  | { kind: "account"; name: string; accountKind: AccountKind; currency: Currency; balance: number };

/** Quick one-line confirmation shown in the chat bubble. */
export function describeAction(action: AiAction): string {
  switch (action.kind) {
    case "task":
      return `Task: ${action.title} · ${action.priority}${action.dueDate ? " · due soon" : ""}`;
    case "income":
      return `${action.label} · ${action.amount} ${action.currency} (${action.category})`;
    case "expense":
      return `${action.label} · ${action.amount} ${action.currency} (${action.category})`;
    case "note":
      return `Note: ${action.title}`;
    case "savingsGoal":
      return `${action.name} · target ${action.target} ${action.currency}`;
    case "account":
      return `${action.name} · ${action.balance} ${action.currency} (${action.accountKind})`;
  }
}

const EXPENSE_KEYWORDS: Array<[RegExp, string]> = [
  [/lunch|dinner|breakfast|coffee|groceries|meal|snack|food|restaurant|cafe/i, "Food"],
  [/fare|jeep|grab|taxi|bus|tricycle|commute|transport|fuel|gas|parking/i, "Transport"],
  [/rent|mortgage|apartment|dorm/i, "Housing"],
  [/water|electric|internet|wifi|bill|utility|postpaid/i, "Utilities"],
  [/shopping|clothes|shoes|outfit|gadget/i, "Shopping"],
  [/movie|game|concert|netflix|spotify|entertainment|cafe|hobby/i, "Entertainment"],
  [/gym|doctor|medicine|pharmacy|clinic|hospital|health/i, "Health"],
  [/school|tuition|books|course|class|education/i, "Education"],
  [/subscription|saas|software/i, "Subscriptions"],
];

const INCOME_KEYWORDS: Array<[RegExp, string]> = [
  [/salary|paycheck|pay\b/i, "Salary"],
  [/freelance|gig|project|client|tutor/i, "Freelance"],
  [/allowance|pocket/i, "Allowance"],
  [/gift|birthday|regalo/i, "Gift"],
  [/scholarship|grant/i, "Scholarship"],
  [/investment|dividend|interest|stock|crypto/i, "Investment"],
];

/** Map a label to the closest category (defaults to "Other"). */
function guessCategory(label: string, list: Array<[RegExp, string]>): string {
  for (const [re, category] of list) if (re.test(label)) return category;
  return "Other";
}

function guessCurrency(token: string, fallback: Currency): Currency {
  if (/php|₱|peso/i.test(token)) return "PHP";
  if (/usd|\$/i.test(token)) return "USD";
  if (/eur|€|euro/i.test(token)) return "EUR";
  if (/jpy|¥|yen/i.test(token)) return "JPY";
  return fallback;
}

interface Parsed {
  label: string;
  amount: number;
  currency: Currency;
}

/** Pull `<amount> [currency]` out of a phrase; null when no amount found. */
function parseAmount(text: string, fallbackCurrency: Currency): Parsed | null {
  const matches = [...text.matchAll(/\d+(?:\.\d+)?/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1]!;
  const amount = Number(last[0]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // Currency token: near the number (within ~12 chars) or anywhere in text.
  const around = text.slice(Math.max(0, last.index! - 4), last.index! + last[0].length + 12);
  const currency = guessCurrency(`${around} ${text}`, fallbackCurrency);
  // Label: strip amount, currency symbols/tokens, and filler words.
  const label = text
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[\$,€¥₱]/g, " ")
    .replace(/php|usd|eur|jpy|peso|dollars|euros|yen/gi, " ")
    .replace(/\b(on|for|at|from|towards?|about|a|an)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { label: label || "Unlabeled", amount, currency };
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  high: "P0",
  urgent: "P0",
  medium: "P1",
  normal: "P1",
  low: "P2",
};

function dayAfter(dayName: string, now: number): number {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const idx = days.indexOf(dayName.toLowerCase());
  if (idx < 0) return 0;
  const date = new Date(now);
  let diff = (idx - date.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return now + diff * DAY_MS;
}

/** Parse a relative/absolute due-date keyword; returns timestamp or null. */
function parseDue(text: string, now: number): { due: number; cleaned: string } | null {
  let due = 0;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\btoday\b/i))) due = now;
  else if ((m = text.match(/\btomorrow\b/i))) due = now + DAY_MS;
  else if ((m = text.match(/\bin\s+(\d+)\s+(day|days|week|weeks)\b/i)))
    due = now + Number(m[1]) * (m[2]!.startsWith("week") ? 7 * DAY_MS : DAY_MS);
  else if ((m = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)))
    due = dayAfter(m[1]!, now);
  else if ((m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/))) {
    const date = new Date(now);
    date.setMonth(Number(m[1]) - 1, Number(m[2]));
    due = date.getTime();
  }
  if (!due) return null;
  const cleaned = text.replace(/today|tomorrow|in\s+\d+\s+(?:day|days|week|weeks)|next\s+(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d{1,2}[\/\-]\d{1,2}/gi, "");
  return { due, cleaned };
}

/** Strip trailing punctuation from a title. */
function cleanTitle(title: string): string {
  return title
    .replace(/^(?:like\s*:?\s*|named\s+|called\s+)/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.,\-'"“”‘’]+|[\s:.,\-'"“”‘’]+$/g, "")
    .trim();
}

/** Small, useful starting detail for an auto-created task. */
export function enrichTaskDescription(title: string): string {
  const t = title.toLowerCase();
  if (/ui|design|interface|frontend|layout|styl|theme|button|widget/i.test(t))
    return "Polish the UI: sketch the change, implement it, then review for consistency across screens.";
  if (/bug|fix|error|issue|broken|crash|buggy/i.test(t))
    return "Reproduce the issue, isolate the cause, apply the fix, then verify nothing else broke.";
  if (/study|read|review|exam|lecture|homework|notes|revise/i.test(t))
    return "Skim the key points, take notes, then self-quiz to make sure it sticks.";
  if (/email|message|reply|respond|inbox/i.test(t))
    return "Draft a short, clear message, send it, then follow up on anything pending.";
  if (/meeting|call|standup|sync/i.test(t))
    return "List the talking points, run the meeting, then summarize the next steps.";
  if (/buy|groceries|shopping|errand|order/i.test(t))
    return "Write the list, compare options, and double-check the total before paying.";
  if (/clean|tidy|organize|declutter|sort/i.test(t))
    return "Do the first small pass now, then finish the rest in one focused go.";
  if (/code|refactor|implement|build|deploy|feature|api/i.test(t))
    return "Scope it small, write the code, test it, then ship and review.";
  return "Break it into small steps and knock out the first one today.";
}

/** Map a label to the closest account kind. */
function guessAccountKind(name: string): AccountKind {
  const n = name.toLowerCase();
  if (/credit|visa|mastercard|amex/i.test(n)) return "credit";
  if (/debit|atm|checking/i.test(n)) return "debit";
  if (/wallet|gcash|maya|paymaya|coins|shopee/i.test(n)) return "e-wallet";
  if (/savings|passbook/i.test(n)) return "savings";
  if (/\bcash\b|efectivo/i.test(n)) return "cash";
  return "other";
}

/** Parse a savings-goal phrase: name + optional target/saved amounts. */
function parseSavingsGoal(text: string, defaultCurrency: Currency): {
  name: string;
  target: number;
  saved: number;
  currency: Currency;
} | null {
  const targetMatch = text.match(/target\s+(\d+(?:\.\d+)?)/i);
  const savedMatch = text.match(/saved\s+(\d+(?:\.\d+)?)/i);
  const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const target = targetMatch ? Number(targetMatch[1]) : nums.length ? nums[nums.length - 1]! : 0;
  const saved = savedMatch ? Number(savedMatch[1]) : 0;
  const currency = guessCurrency(text, defaultCurrency);
  const name = cleanTitle(
    text
      .replace(/target\s+\d+(?:\.\d+)?/gi, " ")
      .replace(/saved\s+\d+(?:\.\d+)?/gi, " ")
      .replace(/\d+(?:\.\d+)?/g, " ")
      .replace(/[\$,€¥₱]/g, " ")
      .replace(/php|usd|eur|jpy|peso|dollars|euros|yen/gi, " ")
      .replace(/\s+/g, " "),
  );
  if (!name || !Number.isFinite(target) || target <= 0) return null;
  return { name, target, saved, currency };
}

/** Parse an account phrase: name + balance + guessed kind. */
function parseAccount(text: string, defaultCurrency: Currency): {
  name: string;
  accountKind: AccountKind;
  currency: Currency;
  balance: number;
} | null {
  const parsed = parseAmount(text, defaultCurrency);
  if (!parsed) return null;
  const name = cleanTitle(parsed.label);
  if (!name) return null;
  return {
    name,
    accountKind: guessAccountKind(name),
    currency: parsed.currency,
    balance: parsed.amount,
  };
}

export function parseAiAction(text: string, defaultCurrency: Currency = "PHP", now = Date.now()): AiAction | null {
  const input = text.trim();
  if (!input) return null;

  // ── Note ──────────────────────────────────────────────────
  let m = input.match(/^(?:add|create|new)\s+(?:a\s+)?note\s*:?\s+(.+)$/i);
  if (m) {
    const [title, content] = splitTitleContent(cleanTitle(m[1]!));
    return { kind: "note", title, content };
  }

  // ── Savings goal ──────────────────────────────────────────
  m = input.match(/^(?:add|create|set|start)\s+(?:a\s+)?(?:savings?\s+goal|goal)\s*:?\s+(.+)$/i);
  if (m) {
    const goal = parseSavingsGoal(m[1]!, defaultCurrency);
    if (goal) return { kind: "savingsGoal", ...goal };
  }

  // ── Account / card / bank ─────────────────────────────────
  m = input.match(/^(?:add|create)\s+(?:an?\s+)?(?:account|card|bank|wallet|e-?wallet)\s*:?\s+(.+)$/i);
  if (m) {
    const account = parseAccount(m[1]!, defaultCurrency);
    if (account) return { kind: "account", ...account };
  }

  // ── Task ──────────────────────────────────────────────────
  m =
    input.match(/^(?:add|create)\s+(?:(?:a|an)\s+)?(?:new\s+)?(?:task|todo|to-?do)\s*:?\s+(.+)$/i) ??
    input.match(/^new\s+(?:task|todo|to-?do)\s*:?\s+(.+)$/i) ??
    input.match(
      /^(?:add|create)\s+(?:(?:a|an)\s+)?(?:p[0-2]|high|medium|low)\s+(?:priority\s+)?(?:task|todo|to-?do)\s*:?\s+(.+)$/i,
    ) ??
    input.match(/^(?:add|create)\s+(?:a\s+)?(.+?)\s+to\s+(?:my\s+)?tasks$/i) ??
    input.match(/^remind\s+me\s+to\s+(.+)$/i);
  if (m) {
    let title = cleanTitle(m[1]!);
    let priority: TaskPriority = "P2";
    // Priority in the verb prefix, e.g. "add P1 task X".
    const pref = m[0].match(/^(?:add|create)\s+(?:(?:a|an)\s+)?(p[0-2]|high|medium|low)\b/i);
    if (pref) priority = PRIORITY_MAP[pref[1]!.toLowerCase()] ?? "P2";
    const pm = title.match(/\b(p0|p1|p2|high|urgent|medium|normal|low)\b/i);
    if (pm) {
      priority = PRIORITY_MAP[pm[1]!.toLowerCase()] ?? priority;
      title = title.replace(pm[0], "");
    }
    const due = parseDue(title, now);
    if (due) title = due.cleaned;
    title = cleanTitle(title);
    if (!title) return null;
    return { kind: "task", title, priority, dueDate: due?.due, description: enrichTaskDescription(title) };
  }

  // ── Expense ───────────────────────────────────────────────
  m =
    input.match(/^(?:add|log|record)\s+(?:an?\s+)?(?:expense|spending|purchase|cost)\s*:?\s+(.+)$/i) ??
    input.match(/^(?:i\s+)?spent\s+(?:an?\s+)?(.+)$/i) ??
    input.match(/^bought\s+(?:an?\s+)?(.+)$/i);
  if (m) {
    const parsed = parseAmount(m[1]!, defaultCurrency);
    if (!parsed) return null;
    const label = cleanTitle(parsed.label);
    if (!label) return null;
    return {
      kind: "expense",
      label,
      amount: Math.round(parsed.amount * 100) / 100,
      currency: parsed.currency,
      category: guessCategory(label, EXPENSE_KEYWORDS),
    };
  }

  // ── Income ────────────────────────────────────────────────
  m =
    input.match(/^(?:add|log|record)\s+(?:an?\s+)?(?:income|earnings?|payout)\s*:?\s+(.+)$/i) ??
    input.match(/^(?:i\s+)?(?:earned|made)\s+(?:an?\s+)?(.+)$/i);
  if (m) {
    const parsed = parseAmount(m[1]!, defaultCurrency);
    if (!parsed) return null;
    const label = cleanTitle(parsed.label);
    if (!label) return null;
    return {
      kind: "income",
      label,
      amount: Math.round(parsed.amount * 100) / 100,
      currency: parsed.currency,
      category: guessCategory(label, INCOME_KEYWORDS),
    };
  }

  return null;
}

/** Split "Title — content" / "Title: content" into a note title + body. */
function splitTitleContent(raw: string): [string, string] {
  const sep = raw.match(/\s+[-–—:]\s+/);
  if (!sep) return [raw, ""];
  const title = raw.slice(0, sep.index!).trim();
  const content = raw.slice(sep.index! + sep[0].length).trim();
  return [title || "Untitled", content];
}

