export function formatDuration(seconds: number, style: "clock" | "short" | "units" = "clock") {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hourCount = Math.floor(safeSeconds / 3_600);
  const minuteCount = Math.floor((safeSeconds % 3_600) / 60);
  const secondCount = Math.floor(safeSeconds % 60);

  if (style === "units") {
    const minutes = minuteCount.toString().padStart(2, "0");
    const secs = secondCount.toString().padStart(2, "0");
    return `${hourCount}h:${minutes}m:${secs}s`;
  }

  const hours = hourCount.toString().padStart(2, "0");
  const minutes = minuteCount.toString().padStart(2, "0");

  if (style === "short") {
    return `${hours}:${minutes}`;
  }

  const secs = secondCount.toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}
