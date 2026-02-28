const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const authApi = {
  signup: (email: string) =>
    api<{ message: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (email: string, otp: string, password: string) =>
    api<{ message: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    }),
  signin: (email: string, password: string) =>
    api<{ access_token: string; email: string }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  resetPassword: (email: string) =>
    api<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};
