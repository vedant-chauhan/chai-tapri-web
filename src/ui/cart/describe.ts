import type { PricedLine } from "@/domain/cart";

/** "Regular · Extra cheese ×2" */
export function describeLine(line: Pick<PricedLine, "choiceLabel" | "extras">): string {
  const parts: string[] = [];
  if (line.choiceLabel) parts.push(line.choiceLabel);
  for (const e of line.extras) parts.push(e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name);
  return parts.join(" · ");
}
