import type { ReactNode } from "react";
import FloatingNav from "@/components/layout/FloatingNav";
import Footer from "@/components/layout/Footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FloatingNav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}