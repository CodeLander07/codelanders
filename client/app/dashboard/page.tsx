"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Calculator, ShieldCheck, PieChart, Coins } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaxMatch = async () => {
      try {
        // Ping our simple calculation endpoint
        // If the user hasn't filled anything, it uses default fallback
        const res = await api.post('/tax/calculate', {
          age: user?.age || 30,
          income_details: { salary: 1200000 }, // Mock default or pull from real endpoint
          deductions: {}
        });
        setTaxData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchTaxMatch();
    }
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-white/60">Here is your automated tax intelligence overview.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Action Cards */}
          <Link href="/documents">
            <motion.div whileHover={{ scale: 1.02 }} className="glass p-6 rounded-3xl h-full flex flex-col justify-center cursor-pointer group hover:bg-white/10 transition-colors">
              <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-purple-400">
                <FileUp size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1">Upload Documents</h3>
              <p className="text-sm text-white/60">Upload Salary Slips, Bank Statements, or 80C Proofs for instant AI extraction.</p>
            </motion.div>
          </Link>

          <Link href="/questionnaire">
            <motion.div whileHover={{ scale: 1.02 }} className="glass p-6 rounded-3xl h-full flex flex-col justify-center cursor-pointer group hover:bg-white/10 transition-colors">
              <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                <Calculator size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-1">Smart Questionnaire</h3>
              <p className="text-sm text-white/60">Find hidden deductions by answering simple questions about your expenses.</p>
            </motion.div>
          </Link>

          <div className="glass p-6 rounded-3xl h-full flex flex-col justify-center opacity-80 border-green-500/20">
            <div className="bg-green-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-green-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1">Privacy Status</h3>
            <p className="text-sm text-white/60">Your data is End-to-End encrypted. Processed documents have been securely purged.</p>
          </div>
        </div>

        {/* Intelligence Widget */}
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><PieChart /> Tax Intelligence Summary</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-8 rounded-3xl">
            <h3 className="font-medium text-white/80 mb-4 uppercase tracking-wider text-sm flex items-center gap-2"><Coins size={16}/> Old vs New Regime</h3>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-white/10 rounded w-1/2" />
                <div className="h-20 bg-white/10 rounded" />
              </div>
            ) : taxData ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-white/60">Modeled Gross Income</p>
                    <p className="text-2xl font-light">₹{taxData.gross_income.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${taxData.recommendation === "Old Regime" ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Old Regime</span>
                      <span className="text-xl">₹{taxData.old_regime.tax_liability.toLocaleString('en-IN')}</span>
                    </div>
                    {taxData.recommendation === "Old Regime" && <p className="text-xs text-purple-400 mt-1">Recommended Choice</p>}
                  </div>

                  <div className={`p-4 rounded-2xl border ${taxData.recommendation === "New Regime" ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">New Regime</span>
                      <span className="text-xl">₹{taxData.new_regime.tax_liability.toLocaleString('en-IN')}</span>
                    </div>
                    {taxData.recommendation === "New Regime" && <p className="text-xs text-blue-400 mt-1">Recommended Choice</p>}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-white/60">
                    Expected Savings with proper declaration:{' '}
                    <span className="text-green-400 font-semibold text-lg">₹{Math.ceil(taxData.potential_savings).toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
            ) : (
                <p>Failed to load data. Complete your profile.</p>
            )}
          </div>
          
          <div className="glass p-8 rounded-3xl flex items-center justify-center flex-col text-center">
             <div className="w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <PieChart size={40} className="text-purple-300" />
             </div>
             <h3 className="text-xl font-semibold mb-2">Automated Optimization</h3>
             <p className="text-white/60 mb-6 max-w-sm">
                To get the most accurate AI prediction, ensure you have uploaded all your financial proofs and completed the smart questionnaire.
             </p>
             <Link href="/questionnaire">
               <button className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition-colors border border-white/10">
                 Complete Profile
               </button>
             </Link>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
