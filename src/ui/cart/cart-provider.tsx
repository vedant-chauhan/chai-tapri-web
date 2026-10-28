"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { priceCart } from "@/domain/cart";
import { cartStore } from "./cart-store";
import { CartBar } from "./cart-bar";
import { CartDrawer } from "./cart-drawer";
import { ItemSheet } from "./item-sheet";

interface CartContextValue {
  priced: ReturnType<typeof priceCart>;
  openItem: (slug: string) => void;
  openCart: () => void;
  /** Screen-reader announcement + the cart-count bump. */
  announceAdded: (text: string) => void;
  bumpKey: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** One provider for the public site: cart state, the item sheet, the cart drawer and the cart bar. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const selections = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const priced = useMemo(() => priceCart(selections), [selections]);
  const [itemSlug, setItemSlug] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [bumpKey, setBumpKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const announceAdded = useCallback((text: string) => {
    setAnnouncement(text);
    setBumpKey((k) => k + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnnouncement(""), 4000);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      priced,
      openItem: setItemSlug,
      openCart: () => setCartOpen(true),
      announceAdded,
      bumpKey,
    }),
    [priced, announceAdded, bumpKey],
  );

  return (
    <CartContext value={value}>
      {children}
      <CartBar />
      <ItemSheet slug={itemSlug} onClose={() => setItemSlug(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </CartContext>
  );
}
