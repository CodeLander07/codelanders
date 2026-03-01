"use client";

import { usePathname } from "next/navigation";

export default function NavWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/dashboard")) return null;
  return <>{children}</>;
}
