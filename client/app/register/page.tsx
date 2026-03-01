"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    age: "",
    employment_type: "Salaried",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null
      };

      const res = await api.post('/auth/register', payload);
      // Backend returns token on register
      login(res.data.access_token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }} 
        className="glass w-full max-w-lg p-8 rounded-3xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
          <p className="text-white/60">Start simplifying your taxes today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Full Name</label>
              <input 
                name="full_name"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="John Doe"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Age</label>
              <input 
                name="age"
                type="number"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="30"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
            <input 
              name="email"
              type="email" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="you@example.com"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Password</label>
            <input 
              name="password"
              type="password" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="••••••••"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Employment Type</label>
            <select 
              name="employment_type"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-[#05050A]"
              onChange={handleChange}
              value={formData.employment_type}
            >
              <option value="Salaried">Salaried</option>
              <option value="Self-employed">Self-employed</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Business">Business</option>
              <option value="Student">Student</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-8">
          Already have an account? <Link href="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
