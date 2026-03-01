# Tax rules config for AY 2024-25 (FY 2023-24)
from typing import Dict, Any

class TaxEngine:
    """
    A deterministic rule engine to calculate taxes based on Indian Income Tax laws.
    Calculates both Old and New Tax Regimes for comparison.
    """
    
    def __init__(self, age: int, income_details: Dict[str, float], deductions: Dict[str, float]):
        self.age = age
        self.income_details = income_details # e.g., {"salary": 1200000, "interest": 10000, "rental": 0}
        self.deductions = deductions         # e.g., {"80c": 150000, "80d": 25000, "hra": 50000}
        
        self.gross_income = sum(self.income_details.values())
        
    def calculate_old_regime(self) -> Dict[str, Any]:
        """
        Old Regime allows standard deductions like 80C, 80D, HRA, LTA, Home Loan Interest etc.
        """
        # Standard deduction for salaried
        std_deduction = 50000 if self.income_details.get("salary", 0) > 0 else 0
        
        total_deduction = std_deduction + sum(self.deductions.values())
        net_taxable_income = max(0, self.gross_income - total_deduction)
        
        tax = 0.0
        
        # Simple Slab Logic for Age < 60
        if self.age < 60:
            if net_taxable_income > 250000:
                tax += (min(net_taxable_income, 500000) - 250000) * 0.05
            if net_taxable_income > 500000:
                tax += (min(net_taxable_income, 1000000) - 500000) * 0.20
            if net_taxable_income > 1000000:
                tax += (net_taxable_income - 1000000) * 0.30
                
        # Rebate under 87A (For old regime, up to 5L is tax free)
        if net_taxable_income <= 500000:
            tax = 0
            
        # Add 4% Health and Education Cess
        tax_with_cess = tax * 1.04
        
        return {
            "net_taxable_income": net_taxable_income,
            "total_deductions_claimed": total_deduction,
            "tax_liability": tax_with_cess
        }

    def calculate_new_regime(self) -> Dict[str, Any]:
        """
        New regime allows Standard Deduction of 50k for salary, but mostly no 80C/80D or HRA.
        Slabs are updated.
        """
        # Standard deduction for salaried is allowed in new regime from FY 23-24
        std_deduction = 50000 if self.income_details.get("salary", 0) > 0 else 0
        
        # Employer contribution to NPS (80CCD(2)) is allowed in new regime. Ignoring for simple logic.
        net_taxable_income = max(0, self.gross_income - std_deduction)
        
        tax = 0.0
        # New Tax Slabs (Budget 2023)
        if net_taxable_income > 300000:
            tax += (min(net_taxable_income, 600000) - 300000) * 0.05
        if net_taxable_income > 600000:
            tax += (min(net_taxable_income, 900000) - 600000) * 0.10
        if net_taxable_income > 900000:
            tax += (min(net_taxable_income, 1200000) - 900000) * 0.15
        if net_taxable_income > 1200000:
            tax += (min(net_taxable_income, 1500000) - 1200000) * 0.20
        if net_taxable_income > 1500000:
            tax += (net_taxable_income - 1500000) * 0.30

        # Rebate under 87A (For new regime, up to 7L is tax free)
        if net_taxable_income <= 700000:
            tax = 0
            
        tax_with_cess = tax * 1.04
        
        return {
            "net_taxable_income": net_taxable_income,
            "total_deductions_claimed": std_deduction,
            "tax_liability": tax_with_cess
        }
        
    def get_recommendation(self) -> Dict[str, Any]:
        old = self.calculate_old_regime()
        new = self.calculate_new_regime()
        
        savings = abs(old["tax_liability"] - new["tax_liability"])
        recommended = "New Regime" if new["tax_liability"] <= old["tax_liability"] else "Old Regime"
        
        return {
            "gross_income": self.gross_income,
            "old_regime": old,
            "new_regime": new,
            "recommendation": recommended,
            "potential_savings": savings
        }
