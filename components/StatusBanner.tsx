import type { SimulateResponse } from "@/types/simulate";

interface StatusBannerProps {
  result: SimulateResponse;
}

export function StatusBanner({ result }: StatusBannerProps) {
  const { status, error, computeUnits } = result;

  const pct = computeUnits.limit > 0
    ? Math.round((computeUnits.used / computeUnits.limit) * 100)
    : 0;

  const cuColor =
    pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-green-600";

  const bannerClass =
    status === "success"
      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";

  const dot =
    status === "success"
      ? "bg-green-500"
      : "bg-red-500";

  return (
    <div className={`rounded-lg border px-4 py-3 ${bannerClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
          <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">
            {status === "success" ? "Success" : "Failed"}
          </span>
          {error && (
            <span className="ml-2 text-sm text-red-700 dark:text-red-300">
              {error.plainEnglish}
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${cuColor}`}>
          {computeUnits.used.toLocaleString()} / {computeUnits.limit.toLocaleString()} CU ({pct}%)
        </span>
      </div>
    </div>
  );
}
