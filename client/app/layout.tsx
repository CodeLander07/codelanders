import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaxMate - AI Tax Assistant',
  description: 'AI-Based Tax Assistant for Smart Filing & Savings Guidance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#05050A] text-white selection:bg-purple-500/30 overflow-x-hidden`}>
        {/* Abstract Background Elements */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-cyan-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  TaxMate
                </span>
              </Link>
              <nav className="flex items-center space-x-6 text-sm font-medium text-white/70">
                <Link href="/dashboard" className="transition-colors hover:text-white">Dashboard</Link>
                <Link href="/questionnaire" className="transition-colors hover:text-white">Questionnaire</Link>
                <div className="h-4 w-px bg-white/10" />
                <Link href="/login" className="transition-colors hover:text-white">Sign In</Link>
                <Link
                  href="/register"
                  className="rounded-full bg-white px-4 py-2 text-black transition-transform hover:scale-105"
                >
                  Get Started
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-white/5 bg-black/40 py-8 backdrop-blur-lg">
            <div className="container mx-auto px-4 text-center text-sm text-white/40">
              <p>We are not a certified tax authority. Your data is encrypted and auto-deleted.</p>
              <p className="mt-2 text-white/20">© 2024 TaxMate. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
