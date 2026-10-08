"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { products, type Product } from "./products";
import { coupons, type Coupon } from "./pricing";

export interface CartLine {
  productId: number;
  qty: number;
}

export type PaymentMethod = "cod" | "upi" | "card";

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
}

export interface Order {
  id: string;
  createdAt: number;
  lines: { productId: number; name: string; emoji: string; unit: string; price: number; qty: number }[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  address: Address;
  slot: string;
  payment: PaymentMethod;
}

interface ShopState {
  cart: CartLine[];
  wishlist: number[];
  orders: Order[];
  couponCode: string | null;
  addToCart: (productId: number, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => void;
  applyCoupon: (code: string) => Coupon | null;
  removeCoupon: () => void;
  placeOrder: (order: Omit<Order, "id" | "createdAt">) => Order;
}

const MAX_QTY = 10;

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      orders: [],
      couponCode: null,
      addToCart: (productId, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((l) => l.productId === productId);
          if (existing) {
            return {
              cart: s.cart.map((l) =>
                l.productId === productId ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l,
              ),
            };
          }
          return { cart: [...s.cart, { productId, qty: Math.min(MAX_QTY, qty) }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((l) => l.productId !== productId)
              : s.cart.map((l) => (l.productId === productId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        })),
      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((l) => l.productId !== productId) })),
      clearCart: () => set({ cart: [], couponCode: null }),
      toggleWishlist: (productId) =>
        set((s) => ({
          wishlist: s.wishlist.includes(productId)
            ? s.wishlist.filter((id) => id !== productId)
            : [...s.wishlist, productId],
        })),
      applyCoupon: (code) => {
        const coupon = coupons.find((c) => c.code === code.trim().toUpperCase()) ?? null;
        set({ couponCode: coupon ? coupon.code : null });
        return coupon;
      },
      removeCoupon: () => set({ couponCode: null }),
      placeOrder: (data) => {
        const order: Order = {
          ...data,
          id: `SBZ${Date.now().toString(36).toUpperCase()}`,
          createdAt: Date.now(),
        };
        set({ orders: [order, ...get().orders], cart: [], couponCode: null });
        return order;
      },
    }),
    { name: "sabzee-shop", version: 1 },
  ),
);

export interface DetailedLine extends CartLine {
  product: Product;
  lineTotal: number;
}

export function detailLines(cart: CartLine[]): DetailedLine[] {
  return cart.flatMap((line) => {
    const product = products.find((p) => p.id === line.productId);
    return product ? [{ ...line, product, lineTotal: product.price * line.qty }] : [];
  });
}
