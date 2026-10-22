import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff · Chai Tapri",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10 sm:px-6">{children}</div>;
}
