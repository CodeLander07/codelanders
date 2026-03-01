"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, FileText, PieChart, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative">
      
      {/* Hero Section */}
      <section className="container px-4 py-24 mx-auto text-center flex flex-col items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            Simplify Your Taxes with {" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
              Intelligence
            </span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            TaxMate is the one-stop solution that puts tax-saving intelligence right at your fingertips.
            Secure document analysis, intelligent deduction discovery, and personalized guidance.
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
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-20 mx-auto z-10">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Feature 1 */}
          <div className="glass p-8 rounded-3xl hover:bg-white/10 transition-colors group cursor-default">
            <div className="h-14 w-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="text-purple-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Smart OCR Extraction</h3>
            <p className="text-white/60 leading-relaxed">
              Upload your salary slips and bank statements. We automatically extract and categorize your income without manual entry.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass p-8 rounded-3xl hover:bg-white/10 transition-colors group cursor-default">
            <div className="h-14 w-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PieChart className="text-blue-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Maximize Deductions</h3>
            <p className="text-white/60 leading-relaxed">
              Compare Old vs New Regimes instantly. Our AI uncovers hidden deductions and government schemes tailored just for you.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass p-8 rounded-3xl hover:bg-white/10 transition-colors group cursor-default">
            <div className="h-14 w-14 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-green-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Bank-Grade Privacy</h3>
            <p className="text-white/60 leading-relaxed">
              Your documents are encrypted and instantly deleted after processing. We never share your data with unauthorized third parties.
            </p>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
