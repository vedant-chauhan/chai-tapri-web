"use client";

/**
 * The browser cart: selections only (no prices), kept in localStorage so it survives navigation
 * and reloads, synced across tabs. Storage can be unavailable (private mode, blocked): the cart
 * then simply lives in memory for the visit.
 */
import { addSelection, parseStoredCart, setQuantity, type CartSelection } from "@/domain/cart";

const KEY = "chai-tapri:cart:v1";
const EMPTY: CartSelection[] = [];

let state: CartSelection[] | null = null;
const listeners = new Set<() => void>();

function read(): CartSelection[] {
  if (state) return state;
  try {
    state = parseStoredCart(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    state = [];
  }
  return state;
}

function write(next: CartSelection[]) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: keep the in-memory cart
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        state = null; // another tab changed it
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  /** Throws CartError for invalid selections (the caller shows the message). */
  add(selection: CartSelection) {
    write(addSelection(read(), selection));
  },
  setQuantity(key: string, quantity: number) {
    write(setQuantity(read(), key, quantity));
  },
  clear() {
    write([]);
  },
};
