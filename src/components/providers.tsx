"use client";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { CompareProvider } from "@/lib/compare";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CompareProvider>
          <CartProvider>{children}</CartProvider>
        </CompareProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
