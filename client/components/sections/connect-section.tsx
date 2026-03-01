"use client";

import { motion } from "framer-motion";
import { Globe, Twitter } from "lucide-react";

export default function ConnectSection() {
  return (
    <section className="w-full border-t border-white/5 z-10">
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10"
        >
          {/* Left: heading */}
          <div className="flex flex-col justify-center pr-0 md:pr-12 pb-10 md:pb-0">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Let&apos;s connect
            </h2>
            <p className="text-white/50 leading-relaxed text-sm max-w-xs">
              We&apos;re here to help and answer any question you might have.
              We look forward to hearing from you.
            </p>
          </div>

          {/* Middle: Discord */}
          <div className="flex flex-col pt-10 md:pt-0 md:px-12">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Globe className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="mb-2 text-base font-semibold">Join our community</h3>
            <p className="mb-4 text-sm text-white/50 leading-relaxed">
              Get help, share tips, and stay up to date with the latest TaxMate
              features alongside other users.
            </p>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group"
            >
              Join our Discord{" "}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          {/* Right: Twitter */}
          <div className="flex flex-col pt-10 md:pt-0 md:pl-12">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Twitter className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="mb-2 text-base font-semibold">Follow us on Twitter</h3>
            <p className="mb-4 text-sm text-white/50 leading-relaxed">
              Stay updated on TaxMate news, tips, and tax-saving hacks straight
              from our team.
            </p>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group"
            >
              Send us DMs{" "}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
