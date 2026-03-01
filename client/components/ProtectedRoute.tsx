"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth().then(() => {
      const token = localStorage.getItem('taxmate_token');
      if (!token && !isAuthenticated) {
        router.push("/login");
      }
    });
  }, [checkAuth, isAuthenticated, router]);

  if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('taxmate_token')) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
