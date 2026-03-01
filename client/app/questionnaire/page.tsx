"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

export default function QuestionnairePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    own_land: false,
    earn_rent: false,
    sell_property: false,
    sell_stocks: false,
    run_business: false,
    is_trader: false,
    agricultural_income: false,
  });

  const [expenses, setExpenses] = useState({
    rent_paid_yearly: "",
    insurance_premium: "",
    nps_contribution: "",
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/profile/questionnaire');
        if (res.data) {
          setFormData({
            own_land: res.data.own_land,
            earn_rent: res.data.earn_rent,
            sell_property: res.data.sell_property,
            sell_stocks: res.data.sell_stocks,
            run_business: res.data.run_business,
            is_trader: res.data.is_trader,
            agricultural_income: res.data.agricultural_income,
          });
          
          if (res.data.housing_data) {
            const h = JSON.parse(res.data.housing_data);
            setExpenses(prev => ({...prev, rent_paid_yearly: h.rent_paid_yearly || ""}));
          }
          if (res.data.health_data) {
            const he = JSON.parse(res.data.health_data);
            setExpenses(prev => ({...prev, insurance_premium: he.insurance_premium || ""}));
          }
        }
      } catch (err) {
        // Not found is fine, means new
      } finally {
        setLoading(false);
      }
    };
    if (user) loadData();
  }, [user]);

  const handleCheckbox = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const handleExpense = (e: any) => {
    setExpenses({ ...expenses, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const payload = {
        ...formData,
        housing_data: JSON.stringify({ rent_paid_yearly: Number(expenses.rent_paid_yearly) || 0 }),
        health_data: JSON.stringify({ insurance_premium: Number(expenses.insurance_premium) || 0 }),
        retirement_data: JSON.stringify({ nps_contribution: Number(expenses.nps_contribution) || 0 }),
      };
      await api.post('/profile/questionnaire', payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Tax Questionnaire</h1>
          <p className="text-white/60">Help us find hidden deductions and government schemes you are eligible for.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="glass p-6 rounded-3xl space-y-4">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-4">Income Discovery</h2>
              
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" name="own_land" checked={formData.own_land} onChange={handleCheckbox} className="form-checkbox h-5 w-5 text-purple-500 rounded bg-black/50 border-white/20" />
                <span className="text-white/80 group-hover:text-white transition-colors">Do you own land or property?</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" name="earn_rent" checked={formData.earn_rent} onChange={handleCheckbox} className="form-checkbox h-5 w-5 text-purple-500 rounded bg-black/50 border-white/20" />
                <span className="text-white/80 group-hover:text-white transition-colors">Do you earn rent from a property?</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" name="sell_stocks" checked={formData.sell_stocks} onChange={handleCheckbox} className="form-checkbox h-5 w-5 text-purple-500 rounded bg-black/50 border-white/20" />
                <span className="text-white/80 group-hover:text-white transition-colors">Did you sell any stocks, mutual funds, or crypto this year?</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" name="run_business" checked={formData.run_business} onChange={handleCheckbox} className="form-checkbox h-5 w-5 text-purple-500 rounded bg-black/50 border-white/20" />
                <span className="text-white/80 group-hover:text-white transition-colors">Do you run a business or work as a freelancer?</span>
              </label>
            </div>

            <div className="glass p-6 rounded-3xl space-y-4">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-4">Expense & Deduction Tracking</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Yearly Rent Paid (₹)</label>
                  <input 
                    name="rent_paid_yearly"
                    type="number"
                    value={expenses.rent_paid_yearly}
                    onChange={handleExpense}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                    placeholder="e.g. 150000"
                  />
                  <p className="text-xs text-white/40 mt-1">Triggers HRA calculation (80GG or component).</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Health Insurance Premium (₹)</label>
                  <input 
                    name="insurance_premium"
                    type="number"
                    value={expenses.insurance_premium}
                    onChange={handleExpense}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                    placeholder="e.g. 20000"
                  />
                  <p className="text-xs text-white/40 mt-1">Triggers Section 80D.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {success ? (
                <div className="flex items-center text-green-400 font-medium">
                  <CheckCircle2 className="mr-2" size={20} /> Saved successfully!
                </div>
              ) : <div></div>}
              
              <button 
                type="submit" 
                disabled={saving}
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                {saving ? "Saving..." : "Save Profile"} {!saving && <ChevronRight size={18} />}
              </button>
            </div>

          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
