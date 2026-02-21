export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getInitials(input?: string | null) {
  if (!input) {
    return "NA";
  }

  const chunks = input
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (chunks.length === 0) {
    return "NA";
  }

  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function maskText(value: string, max = 12) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}
