import type { Metadata } from "next";
import { OrderReview } from "@/ui/cart/order-review";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

// Step 1 of checkout (SITEMAP: review → pickup time → details → payment). Steps 2–4 arrive with
// slice-1 checkout (Stripe); the cart lives in the browser, so the page body is a client component.
export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <h1 className="font-sign pt-10 text-6xl sm:pt-14">Your order</h1>
      <OrderReview />
    </div>
  );
}
