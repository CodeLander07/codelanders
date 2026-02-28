"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Feature108 } from "@/components/ui/shadcnblocks-com-feature108";

const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"] });

// Inline Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white",
      gradient:
        "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Navigation Component
const Navigation = React.memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
         <Image src="/logo.png" alt="Logo" width={150} height={150} />

          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Services
            </Link>
            <Link
              href="industries"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Industries
            </Link>
            <Link
              href="about-us"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              About Us
            </Link>
            <Link
              href="contact"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Contact Us
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in">
              <Button type="button" variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button type="button" variant="default" size="sm">
                Sign Up
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out] ">
          <div className="px-6 py-10 flex flex-col gap-4">
            <a
              href="#getting-started"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Getting started
            </a>
            <a
              href="#components"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Components
            </a>
            <a
              href="#documentation"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
              <Link href="/sign-in">
                <Button type="button" variant="ghost" size="sm" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button type="button" variant="default" size="sm" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

// Hero Component
const Hero = React.memo(function Hero() {
  return (
    <section
      className={cn(
        "relative min-h-screen flex flex-col items-center justify-start px-6 py-36 md:py-24",
        poppins.className
      )}
      style={{ animation: "fadeIn 0.6s ease-out" }}
    >
      <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 mt-10 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full">
        <span className="text-xs text-center whitespace-nowrap text-gray-400">
          AI-Powered Solutions for Your Business
        </span>
      </aside>

      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6"
        style={{
          background:
            "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.05em",
        }}
      >
       The One Stop Solution for Tax Saving Intelligence
      </h1>

      <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-10 text-gray-400">
      TaxMate simplifies income tax filing with secure document analysis, intelligent deduction discovery, and personalized tax saving guidance — all in one place.
      </p>

      <div className="flex items-center gap-4 relative z-10 mb-16">
        <Link href="/sign-in?redirect=/dashboard">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="rounded-lg flex items-center justify-center"
            aria-label="Get started with the template"
          >
            Get started
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-5xl relative pb-20">
        <div
          className="absolute left-1/2 w-[90%] pointer-events-none z-0"
          style={{
            top: "-23%",
            transform: "translateX(-50%)",
          }}
          aria-hidden
        >
          <img
            src="/heroImages/glows.png"
            alt=""
            className="w-full h-auto"
            loading="eager"
          />
        </div>

        <div className="relative z-10">
          <img
            src="/heroImages/Dashboard2.png"
            alt="Dashboard preview showing analytics and metrics interface"
            className="w-full h-auto rounded-lg shadow-2xl"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

// Main Component
export default function SaaSTemplate() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navigation />
      <Hero />
      <Feature108 />
    </main>
  );
}
