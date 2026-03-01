"use client";

import { motion } from "framer-motion";
import { FileText, PieChart, ShieldCheck, Palette, Search, BarChart3 } from "lucide-react";
import { ServiceCarousel, type Service } from "@/components/ui/services-card";
import HeroSection from "@/components/sections/hero-section";
import ConnectSection from "@/components/sections/connect-section";

const services: Service[] = [
  {
    number: "001",
    title: "Document OCR",
    description:
      "Upload salary slips, Form 16, or bank statements. We extract structured data automatically.",
    icon: FileText,
    gradient: "from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50",
  },
  {
    number: "002",
    title: "Tax Computation",
    description:
      "Instant Old vs New Regime comparison with precise tax liability calculations.",
    icon: BarChart3,
    gradient: "from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50",
  },
  {
    number: "003",
    title: "Deduction Discovery",
    description:
      "Our AI surfaces hidden deductions under 80C, 80D, HRA and more — tailored to you.",
    icon: Search,
    gradient: "from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50",
  },
  {
    number: "004",
    title: "Smart Advisory",
    description:
      "Personalised guidance on investment and savings strategies to lower your tax outgo.",
    icon: Palette,
    gradient: "from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center relative">

      {/* 1 — Hero */}
      <HeroSection />

      {/* 2 — Features */}
      <section className="container px-4 py-20 mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Why TaxMate?
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
            Purpose-built to make filing less painful and savings more visible.
          </p>
        </motion.div>

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

      {/* 3 — Services Carousel */}
      <section className="w-full py-20 z-10">
        <div className="container mx-auto px-4 mb-12 max-w-6xl">
          <h2 className="text-5xl font-bold tracking-tighter">Services.</h2>
          <p className="mt-3 text-white/60 text-lg">
            Everything you need to file smarter and save more.
          </p>
        </div>
        <ServiceCarousel services={services} />
      </section>

      {/* 4 — Let's connect */}
      <ConnectSection />

    </div>
  );
}

