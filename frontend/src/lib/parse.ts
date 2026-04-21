/**
 * Ported from flathunter/filter.py ExposeHelper
 * Parses Dutch real estate listing text fields into numbers
 */

export function parsePrice(priceText: string): number | null {
  // Match patterns like "€ 595.000 k.k.", "€ 1.250.000", "€699.000"
  const match = priceText.match(/\d+([\.,]\d+)*/);
  if (!match) return null;
  // Dutch format: dots as thousands separator, comma as decimal
  // "595.000" -> 595000, "1.250.000" -> 1250000
  const raw = match[0];
  // If it contains dots and the last segment after dot is 3 digits, dots are thousands separators
  const parts = raw.split(".");
  if (parts.length > 1 && parts[parts.length - 1].length === 3) {
    // Thousands separators
    return parseFloat(parts.join(""));
  }
  // Otherwise treat comma as decimal
  return parseFloat(raw.replace(/\./g, "").replace(",", "."));
}

export function parseSize(sizeText: string): number | null {
  const match = sizeText.match(/\d+([\.,]\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(",", "."));
}

export function parseRooms(roomsText: string): number | null {
  const match = roomsText.match(/\d+([\.,]\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(",", "."));
}

export function computePricePerSqm(
  priceNumeric: number | null,
  sizeNumeric: number | null
): number | null {
  if (!priceNumeric || !sizeNumeric || sizeNumeric === 0) return null;
  return Math.round(priceNumeric / sizeNumeric);
}

export function extractPostalPrefix(address: string): string | null {
  // Dutch postal codes: 4 digits + 2 letters, e.g. "2548 SX"
  const match = address.match(/(\d{4})\s*[A-Z]{2}/);
  return match ? match[1] : null;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "N/A";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPricePerSqm(price: number | null): string {
  if (price === null) return "N/A";
  return `${formatPrice(price)}/m²`;
}
