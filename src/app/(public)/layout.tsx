import { CartProvider } from "@/ui/cart/cart-provider";
import { SiteFooter } from "@/ui/site-footer";
import { SiteHeader } from "@/ui/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </CartProvider>
  );
}
