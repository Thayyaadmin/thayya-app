export function formatWorkshopDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "Date not available";
  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? String(dateValue) : parsedDate.toLocaleString();
}

export function formatWorkshopPrice(priceValue: number | string | null | undefined): string {
  if (priceValue === null || priceValue === undefined || priceValue === "") return "Price unavailable";
  const n = typeof priceValue === "number" ? priceValue : Number(priceValue);
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return String(priceValue);
}

export function formatWorkshopVenue(w: {
  venue_name?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  const parts = [w.venue_name, w.address_line, w.city, w.state, w.country]
    .map((p) => (p && String(p).trim()) || "")
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "Venue TBA";
}

/** Last word gets gradient highlight (matches instructor / book mock). */
export function splitTitleForGradientHeading(title: string): { lead: string; gradient: string } {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lead: "", gradient: "Workshop" };
  }
  if (parts.length === 1) {
    return { lead: "", gradient: parts[0]! };
  }
  return {
    lead: parts.slice(0, -1).join(" "),
    gradient: parts[parts.length - 1]!,
  };
}
