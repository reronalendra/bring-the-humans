// list-bounties.mjs — list make.fun's live bounties, newest first.
// No dependencies: Node.js 22+ only. Run: node scripts/list-bounties.mjs
// Data: the public competitions endpoint, https://make.fun/api/competitions

const MAX_PAGES = 50;
const items = [];
let cursor = null;
let pages = 0;
do {
  const url = new URL("https://make.fun/api/competitions");
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`make.fun answered HTTP ${res.status}`);
  const page = await res.json();
  items.push(...(page.items ?? []));
  cursor = page.next_cursor ?? null;
  pages += 1;
} while (cursor && pages < MAX_PAGES);

const open = items
  .filter((c) => c.status === "open")
  .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));

if (open.length === 0) {
  console.log("No open bounties right now — check back at https://make.fun");
  process.exit(0);
}

// Deadlines in the reader's own local time zone (whatever this machine is set to).
const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
  timeZoneName: "short",
});

for (const c of open) {
  const deadline = new Date(c.deadline);
  // new Date(null) is the 1970 epoch, not NaN — so guard the missing value too.
  const closes = !c.deadline || Number.isNaN(deadline.getTime()) ? "TBD" : fmt.format(deadline);
  const pot = Number(c.potUsd ?? 0).toLocaleString("en-US");
  const fee = !Number(c.entryFeeUsd) ? "free" : `$${c.entryFeeUsd} entry`;
  const count = c.submissionCount ?? 0;
  console.log(
    `- ${c.title} — $${pot} pot, ${fee}, closes ${closes}, ` +
      `${count} ${count === 1 ? "entry" : "entries"} — https://make.fun/bounty/${c.slug}`,
  );
}
console.log(
  `\n${open.length} open ${open.length === 1 ? "bounty" : "bounties"}. Pick one, read its rules, build, submit.`,
);
