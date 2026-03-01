"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="container px-4 py-24 mx-auto text-center flex flex-col items-center justify-center z-10 min-h-[calc(100vh-4rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-block mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-white/60 tracking-widest uppercase"
        >
          AI-Powered Tax Filing
        </motion.span>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Simplify Your Taxes{" "}
          <br className="hidden md:block" />
          with{" "}
          <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-blue-400 to-cyan-400">
            Intelligence
          </span>
        </h1>

        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          TaxMate is the one-stop solution that puts tax-saving intelligence
          right at your fingertips. Secure document analysis, intelligent
          deduction discovery, and personalized guidance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <button className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Start Saving Now <ArrowRight size={20} />
            </button>
          </Link>
          <Link href="/login">
            <button className="px-8 py-4 rounded-full font-semibold border border-white/20 hover:bg-white/10 transition-all text-white">
              Sign In
            </button>
          </Link>
        </div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-white/40 text-sm"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-white">₹0</span>
            <span>Cost to get started</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-white">2 min</span>
            <span>Avg. setup time</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-white">Old & New</span>
            <span>Tax regimes compared</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
