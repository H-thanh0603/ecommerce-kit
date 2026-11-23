"use client";

import { LazyMotion, domAnimation } from "motion/react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { CompareProvider } from "@/lib/compare";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <AuthProvider>
        <WishlistProvider>
          <CompareProvider>
            <CartProvider>
              {children}
              <Toaster
                position="bottom-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    fontFamily: "var(--font-be-vietnam), ui-sans-serif, system-ui, sans-serif",
                  },
                }}
              />
            </CartProvider>
          </CompareProvider>
        </WishlistProvider>
      </AuthProvider>
    </LazyMotion>
  );
}
