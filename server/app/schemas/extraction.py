"""
Pydantic models for the document extraction output schema.
Matches the exact JSON contract defined in the extraction engine spec.
"""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class BankTransaction(BaseModel):
    date: str = Field(..., description="ISO 8601 date: YYYY-MM-DD")
    amount: float
    description: str
    source: Literal["bank_statement"] = "bank_statement"


class EMIPayment(BaseModel):
    date: str = Field(..., description="ISO 8601 date: YYYY-MM-DD")
    amount: float
    lender: str


class OtherSpending(BaseModel):
    category: str
    amount: float


class CapitalGains(BaseModel):
    stocks: Optional[float] = None
    mutual_funds: Optional[float] = None


class DocumentMetadata(BaseModel):
    document_type: str
    status: Literal["parsed", "partial", "failed"]


class ExtractionResult(BaseModel):
    """
    Top-level structured financial data object produced by the extraction engine.
    Downstream tax calculations and AI insights consume this schema directly.
    """
    salary: Optional[float] = None
    bank_transactions: List[BankTransaction] = Field(default_factory=list)
    rent_paid: Optional[float] = None
    emi_payments: List[EMIPayment] = Field(default_factory=list)
    interest_income: Optional[float] = None
    capital_gains: CapitalGains = Field(default_factory=CapitalGains)
    annual_savings: Optional[float] = None
    other_spendings: List[OtherSpending] = Field(default_factory=list)
    document_metadata: List[DocumentMetadata] = Field(default_factory=list)
