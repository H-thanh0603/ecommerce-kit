"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem, Product } from "@/types";

const KEY = "atelier.cart.v1";

type CartContextValue = {
  items: CartItem[];
  add: (product: Product, quantity?: number, variantLabel?: string, skuId?: string) => void;
  remove: (productId: string, variantLabel?: string) => void;
  setQty: (productId: string, quantity: number, variantLabel?: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: CartItem, id: string, variant?: string) {
  return a.productId === id && (a.variantLabel || "") === (variant || "");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const remote = await fetch("/api/cart").then((r) => r.json());
        if (Array.isArray(remote.items) && remote.items.length) {
          setItems(remote.items);
        } else {
          const raw = localStorage.getItem(KEY);
          if (raw) setItems(JSON.parse(raw) as CartItem[]);
        }
      } catch {
        /* ignore */
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(items));
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).catch(() => {});
  }, [items, ready]);

  const add = useCallback(
    (product: Product, quantity = 1, variantLabel?: string, skuId?: string) => {
      setItems((prev) => {
        const found = prev.find((i) => sameLine(i, product.id, variantLabel));
        if (found) {
          return prev.map((i) =>
            sameLine(i, product.id, variantLabel)
              ? { ...i, quantity: i.quantity + quantity, skuId: skuId || i.skuId }
              : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0],
            price: product.price,
            quantity,
            variantLabel,
            skuId,
          },
        ];
      });
    },
    [],
  );

  const remove = useCallback((productId: string, variantLabel?: string) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, variantLabel)));
  }, []);

  const setQty = useCallback(
    (productId: string, quantity: number, variantLabel?: string) => {
      if (quantity <= 0) return remove(productId, variantLabel);
      setItems((prev) =>
        prev.map((i) =>
          sameLine(i, productId, variantLabel) ? { ...i, quantity } : i,
        ),
      );
    },
    [remove],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { items, add, remove, setQty, clear, count, subtotal };
  }, [items, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải nằm trong CartProvider");
  return ctx;
}
