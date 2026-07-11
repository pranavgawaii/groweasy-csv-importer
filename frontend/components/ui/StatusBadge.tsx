import type { CrmStatus } from "@/types/crm";

const STATUS_META: Record<CrmStatus, { label: string; className: string }> = {
  GOOD_LEAD_FOLLOW_UP: {
    label: "Good · Follow up",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  },
  DID_NOT_CONNECT: {
    label: "Did not connect",
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  },
  BAD_LEAD: {
    label: "Bad lead",
    className:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
  },
  SALE_DONE: {
    label: "Sale done",
    className:
      "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  },
};

export function StatusBadge({ status }: { status: CrmStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
