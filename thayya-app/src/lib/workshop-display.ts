export function formatWorkshopDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "Date not available";
  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? String(dateValue) : parsedDate.toLocaleString();
}

export function formatWorkshopPrice(priceValue: number | string | null | undefined): string {
  if (priceValue === null || priceValue === undefined || priceValue === "") return "Price unavailable";
  return typeof priceValue === "number" ? `₹${priceValue}` : String(priceValue);
}
