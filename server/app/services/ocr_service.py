"""
TaxMate — Document Parsing & Financial Data Extraction Engine
=============================================================
Responsibility: Convert uploaded documents into clean, structured,
machine-readable financial data.

Rules:
- Extract numeric values EXACTLY as present in the document.
- Do NOT infer, guess, calculate totals, or apply tax rules.
- Mark missing / unclear fields as null.
- Preserve original dates and descriptions.
- Normalize currencies to INR.
- Delete raw file from disk immediately after extraction (privacy).
"""

from __future__ import annotations

import csv
import io
import logging
import os
import re
from datetime import datetime
from typing import List, Optional

logger = logging.getLogger(__name__)

# ── Optional heavy deps (graceful fallback if not installed) ──────────────────
try:
    import pdfplumber  # type: ignore
    _PDF_OK = True
except ImportError:
    _PDF_OK = False
    logger.warning("pdfplumber not installed — PDF parsing disabled.")

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
    _OCR_OK = True
except ImportError:
    _OCR_OK = False
    logger.warning("pytesseract / Pillow not installed — image OCR disabled.")


# ─────────────────────────────────────────────────────────────────────────────
# Regex helpers
# ─────────────────────────────────────────────────────────────────────────────

# INR amount: optional ₹/Rs/INR prefix, numbers with optional commas, optional decimals
# e.g.  ₹1,20,000.00   Rs. 45000   INR 9500.5   1200000
_RE_AMOUNT = re.compile(
    r"(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

# Dates: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY, DD-MMM-YYYY
_RE_DATE = re.compile(
    r"\b(?:"
    r"(\d{4})-(\d{2})-(\d{2})"               # YYYY-MM-DD
    r"|(\d{2})[/-](\d{2})[/-](\d{4})"         # DD/MM/YYYY or DD-MM-YYYY
    r"|(\d{2})[\s-]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-]?(\d{4})"
    r")\b",
    re.IGNORECASE,
)

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# Keywords per category (lowercase)
_KW_SALARY     = {"salary", "payslip", "pay slip", "net pay", "gross pay", "basic pay",
                   "ctc", "take home", "in hand", "earnings", "remuneration"}
_KW_BANK       = {"bank statement", "account statement", "transaction", "debit", "credit",
                   "balance", "neft", "rtgs", "imps", "upi"}
_KW_RENT       = {"rent", "hra", "house rent", "rental", "landlord", "tenant"}
_KW_EMI        = {"emi", "equated monthly", "loan repayment", "home loan", "car loan",
                   "personal loan", "outstanding", "emi paid"}
_KW_INTEREST   = {"interest income", "fd interest", "fixed deposit", "savings interest",
                   "interest earned", "interest credited", "recurring deposit"}
_KW_CAP_GAINS  = {"capital gain", "capital gains", "stcg", "ltcg", "short term",
                   "long term", "equity", "mutual fund", "redemption", "proceeds"}
_KW_INVEST     = {"80c", "lic", "ppf", "epf", "nsc", "elss", "nps", "80ccd",
                   "investment proof", "insurance premium", "provident fund"}


# ─────────────────────────────────────────────────────────────────────────────
# Utility functions
# ─────────────────────────────────────────────────────────────────────────────

def _parse_amount(text: str) -> Optional[float]:
    """
    Extract a single INR numeric value from a short string.
    Returns None if nothing parseable is found.
    """
    m = _RE_AMOUNT.search(text)
    if not m:
        return None
    raw = m.group(1).replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return None


def _parse_date(text: str) -> Optional[str]:
    """
    Parse the first recognisable date in `text` and return it as YYYY-MM-DD.
    Returns None if no date is found.
    """
    m = _RE_DATE.search(text)
    if not m:
        return None
    g = m.groups()
    try:
        if g[0]:                    # YYYY-MM-DD
            return f"{g[0]}-{g[1]}-{g[2]}"
        if g[3]:                    # DD/MM/YYYY
            return f"{g[5]}-{g[4].zfill(2)}-{g[3].zfill(2)}"
        if g[6]:                    # DD MMM YYYY
            mon = _MONTHS.get(g[7].lower()[:3])
            if mon:
                return f"{g[8]}-{str(mon).zfill(2)}-{g[6].zfill(2)}"
    except Exception:
        pass
    return None


def _keyword_hit(text: str, keywords: set) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in keywords)


def _deduplicate(records: list, key_fn) -> list:
    """Remove exact duplicate records based on a key function."""
    seen = set()
    out = []
    for r in records:
        k = key_fn(r)
        if k not in seen:
            seen.add(k)
            out.append(r)
    return out


def _largest_amount(text: str) -> Optional[float]:
    """
    Scan text for all INR amounts and return the largest one.
    Useful for salary slips, rent receipts, etc.
    """
    amounts = []
    for m in _RE_AMOUNT.finditer(text):
        raw = m.group(1).replace(",", "")
        try:
            amounts.append(float(raw))
        except ValueError:
            pass
    return max(amounts) if amounts else None


# ─────────────────────────────────────────────────────────────────────────────
# Raw text extraction (PDF / Image / CSV → plain text + rows)
# ─────────────────────────────────────────────────────────────────────────────

class _RawExtract:
    """Container for raw content pulled from a single file."""
    text: str = ""
    tables: List[List[List[str]]] = []   # list of tables; each table is list of rows
    csv_rows: List[List[str]] = []
    parse_error: Optional[str] = None


def _extract_raw_pdf(file_path: str) -> _RawExtract:
    out = _RawExtract()
    if not _PDF_OK:
        out.parse_error = "pdfplumber not installed"
        return out
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    out.text += page_text + "\n"
                # Table extraction
                tables = page.extract_tables()
                if tables:
                    out.tables.extend(tables)
    except Exception as e:
        out.parse_error = str(e)
    return out


def _extract_raw_image(file_path: str) -> _RawExtract:
    out = _RawExtract()
    if not _OCR_OK:
        out.parse_error = "pytesseract / Pillow not installed"
        return out
    try:
        image = Image.open(file_path)
        out.text = pytesseract.image_to_string(image)
    except Exception as e:
        out.parse_error = str(e)
    return out


def _extract_raw_csv(file_path: str) -> _RawExtract:
    out = _RawExtract()
    try:
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.reader(f)
            rows = [row for row in reader if any(cell.strip() for cell in row)]
        out.csv_rows = rows
        # Also produce a flat text blob for keyword matching
        out.text = "\n".join(",".join(r) for r in rows)
    except Exception as e:
        out.parse_error = str(e)
    return out


def _extract_raw(file_path: str, filename: str) -> _RawExtract:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return _extract_raw_pdf(file_path)
    if ext in (".jpg", ".jpeg", ".png"):
        return _extract_raw_image(file_path)
    if ext in (".csv", ".xlsx"):
        return _extract_raw_csv(file_path)
    out = _RawExtract()
    out.parse_error = f"Unsupported file extension: {ext}"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Category classifiers
# ─────────────────────────────────────────────────────────────────────────────

def _classify_document(text: str) -> str:
    """Return the most likely document category based on keyword density."""
    lower = text.lower()
    scores = {
        "Salary Slips":                   sum(1 for kw in _KW_SALARY    if kw in lower),
        "Bank Statements":                sum(1 for kw in _KW_BANK      if kw in lower),
        "Rent Receipts":                  sum(1 for kw in _KW_RENT      if kw in lower),
        "Monthly EMI":                    sum(1 for kw in _KW_EMI       if kw in lower),
        "Interest Income (FD, Savings)":  sum(1 for kw in _KW_INTEREST  if kw in lower),
        "Capital Gains (Stocks, MFs)":    sum(1 for kw in _KW_CAP_GAINS if kw in lower),
        "Annual Savings / Investments":   sum(1 for kw in _KW_INVEST    if kw in lower),
    }
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "Other Spending Proofs"


# ─────────────────────────────────────────────────────────────────────────────
# Field extractors — each operates on raw text + tables
# ─────────────────────────────────────────────────────────────────────────────

def _extract_salary(text: str) -> Optional[float]:
    """
    Look for explicit net/gross pay lines and return that amount.
    Falls back to the largest number if salary keywords are present.
    """
    patterns = [
        r"(?:net\s*pay|take\s*home|in\s*hand)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        r"(?:gross\s*salary|gross\s*pay|ctc)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        r"(?:basic\s*salary|basic\s*pay)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
    if _keyword_hit(text, _KW_SALARY):
        return _largest_amount(text)
    return None


def _extract_bank_transactions(text: str, tables: List) -> list:
    """
    Parse bank transactions from table rows or line-by-line text.
    Each entry must have: date, amount, description.
    """
    transactions = []

    # 1. Try structured tables first
    for table in tables:
        if not table:
            continue
        # Heuristic: header row typically contains "date" / "amount" / "description"
        header = [str(c).lower().strip() if c else "" for c in table[0]]
        date_col = amt_col = desc_col = None
        for i, h in enumerate(header):
            if any(x in h for x in ("date", "dt", "txn date", "value date")):
                date_col = i
            if any(x in h for x in ("amount", "debit", "credit", "withdrawal", "deposit")):
                if amt_col is None:
                    amt_col = i
            if any(x in h for x in ("description", "narration", "particulars", "remarks", "detail")):
                desc_col = i

        if date_col is None or amt_col is None:
            continue

        for row in table[1:]:
            if not row or len(row) <= max(filter(None, [date_col, amt_col, desc_col])):
                continue
            raw_date = str(row[date_col] or "").strip()
            raw_amt  = str(row[amt_col]  or "").strip()
            raw_desc = str(row[desc_col] or "").strip() if desc_col is not None else "—"

            if not raw_date or not raw_amt:
                continue

            iso_date = _parse_date(raw_date)
            amount   = _parse_amount(raw_amt)
            if iso_date and amount and amount > 0:
                transactions.append({
                    "date": iso_date,
                    "amount": amount,
                    "description": raw_desc,
                    "source": "bank_statement",
                })

    # 2. Fallback: line-by-line regex scan
    if not transactions:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            iso_date = _parse_date(line)
            amount   = _parse_amount(line)
            if iso_date and amount and amount > 0 and _keyword_hit(line, _KW_BANK):
                transactions.append({
                    "date": iso_date,
                    "amount": amount,
                    "description": line[:120],
                    "source": "bank_statement",
                })

    # Deduplicate on (date, amount, description[:40])
    transactions = _deduplicate(
        transactions,
        lambda t: (t["date"], t["amount"], t["description"][:40]),
    )
    return transactions


def _extract_rent(text: str) -> Optional[float]:
    patterns = [
        r"(?:rent\s*paid|monthly\s*rent|house\s*rent|rental\s*amount)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        r"(?:amount|total)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)\s*(?:towards\s*rent|as\s*rent)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
    if _keyword_hit(text, _KW_RENT):
        return _largest_amount(text)
    return None


def _extract_emi_payments(text: str, tables: List) -> list:
    payments = []

    # Table-based
    for table in tables:
        if not table:
            continue
        header = [str(c).lower().strip() if c else "" for c in table[0]]
        date_col = amt_col = lender_col = None
        for i, h in enumerate(header):
            if "date" in h:
                date_col = i
            if any(x in h for x in ("emi", "amount", "instalment", "debit")):
                if amt_col is None:
                    amt_col = i
            if any(x in h for x in ("lender", "bank", "institution", "loan", "towards")):
                lender_col = i
        if date_col is None or amt_col is None:
            continue
        for row in table[1:]:
            if not row:
                continue
            iso_date = _parse_date(str(row[date_col] or ""))
            amount   = _parse_amount(str(row[amt_col] or ""))
            lender   = str(row[lender_col] or "Unknown").strip() if lender_col is not None else "Unknown"
            if iso_date and amount and amount > 0:
                payments.append({"date": iso_date, "amount": amount, "lender": lender})

    # Line-based fallback
    if not payments:
        for line in text.splitlines():
            if _keyword_hit(line, _KW_EMI):
                iso_date = _parse_date(line)
                amount   = _parse_amount(line)
                if iso_date and amount and amount > 0:
                    # Try to pull lender name: capitalised token before/after "EMI"
                    lender_m = re.search(r"([A-Z][A-Za-z\s]+(?:Bank|Finance|Housing|NBFC))", line)
                    lender = lender_m.group(1).strip() if lender_m else "Unknown"
                    payments.append({"date": iso_date, "amount": amount, "lender": lender})

    return _deduplicate(payments, lambda p: (p["date"], p["amount"], p["lender"]))


def _extract_interest_income(text: str) -> Optional[float]:
    patterns = [
        r"(?:interest\s*(?:income|earned|credited|received)|fd\s*interest|savings\s*interest)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        r"([\d,]+(?:\.\d{1,2})?)\s*(?:credited\s*as\s*interest|as\s*interest\s*income)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
    if _keyword_hit(text, _KW_INTEREST):
        return _largest_amount(text)
    return None


def _extract_capital_gains(text: str) -> dict:
    """Return {"stocks": float|None, "mutual_funds": float|None}."""
    stocks = mfs = None

    pat_stcg = re.compile(
        r"(?:stcg|short[\s\-]?term\s*(?:capital\s*)?gain)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        re.IGNORECASE,
    )
    pat_ltcg = re.compile(
        r"(?:ltcg|long[\s\-]?term\s*(?:capital\s*)?gain)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        re.IGNORECASE,
    )
    pat_stocks = re.compile(
        r"(?:equity|shares|stocks?)\s*(?:gain|profit|proceeds)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        re.IGNORECASE,
    )
    pat_mf = re.compile(
        r"(?:mutual\s*fund|mf|elss)\s*(?:redemption|gain|profit|proceeds)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        re.IGNORECASE,
    )

    def _first_float(pat: re.Pattern) -> Optional[float]:
        m = pat.search(text)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                pass
        return None

    stocks = _first_float(pat_stocks) or _first_float(pat_stcg) or _first_float(pat_ltcg)
    mfs    = _first_float(pat_mf)

    if stocks is None and mfs is None and _keyword_hit(text, _KW_CAP_GAINS):
        largest = _largest_amount(text)
        stocks = largest  # best-guess: attribute to stocks

    return {"stocks": stocks, "mutual_funds": mfs}


def _extract_annual_savings(text: str) -> Optional[float]:
    patterns = [
        r"(?:total\s*(?:80c\s*)?(?:investments?|deductions?|savings?)|annual\s*savings?)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
        r"(?:80c|80\s*c)\s*[:\-₹Rs\.]*\s*([\d,]+(?:\.\d{1,2})?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
    if _keyword_hit(text, _KW_INVEST):
        return _largest_amount(text)
    return None


def _extract_other_spendings(text: str, tables: List) -> list:
    """
    Catch-all: extract spending lines that don't fit the above categories.
    Returns [{category, amount}] pairs.
    """
    spendings = []
    _skip_kw = _KW_SALARY | _KW_BANK | _KW_RENT | _KW_EMI | _KW_INTEREST | _KW_CAP_GAINS | _KW_INVEST

    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) < 6:
            continue
        if _keyword_hit(line, _skip_kw):
            continue
        amount = _parse_amount(line)
        if amount and amount > 0:
            # Strip currency symbols and amounts from description
            desc = re.sub(r"[₹₹Rs.INR\d,\.]+", "", line).strip(" :-")
            if len(desc) >= 4:
                spendings.append({"category": desc[:80], "amount": amount})

    # Deduplicate
    spendings = _deduplicate(spendings, lambda s: (s["category"][:30], s["amount"]))
    return spendings[:20]  # cap at 20 to avoid noise


# ─────────────────────────────────────────────────────────────────────────────
# CSV-specialised parser (row-based)
# ─────────────────────────────────────────────────────────────────────────────

def _parse_csv_transactions(rows: List[List[str]]) -> list:
    """
    Row-based CSV parsing for bank statement / transaction exports.
    Auto-detects header row and maps columns.
    """
    if not rows:
        return []

    # Find header row (first row with ≥3 non-empty cells)
    header_idx = 0
    for i, row in enumerate(rows[:5]):
        if len([c for c in row if c.strip()]) >= 3:
            header_idx = i
            break

    header = [c.lower().strip() for c in rows[header_idx]]
    date_col = amt_col = desc_col = None
    for i, h in enumerate(header):
        if any(x in h for x in ("date", "dt", "value date")):
            date_col = i
        if any(x in h for x in ("amount", "debit", "credit", "withdrawal", "deposit", "txn amount")):
            if amt_col is None:
                amt_col = i
        if any(x in h for x in ("description", "narration", "particulars", "remarks")):
            desc_col = i

    if date_col is None or amt_col is None:
        return []

    transactions = []
    for row in rows[header_idx + 1:]:
        if len(row) <= max(filter(None, [date_col, amt_col, desc_col or 0])):
            continue
        iso_date = _parse_date(row[date_col])
        amount   = _parse_amount(row[amt_col])
        desc     = row[desc_col].strip() if desc_col is not None else "—"
        if iso_date and amount and amount > 0:
            transactions.append({
                "date": iso_date,
                "amount": amount,
                "description": desc,
                "source": "bank_statement",
            })
    return _deduplicate(transactions, lambda t: (t["date"], t["amount"], t["description"][:40]))


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def process_document(file_path: str, filename: str) -> dict:
    """
    Entry point called by the upload background task.

    Steps:
      1. Extract raw text / tables / CSV rows from the file.
      2. Classify the document type by keyword density.
      3. Run targeted field extractors.
      4. Merge results into the canonical ExtractionResult JSON schema.
      5. Delete the raw file from disk (privacy).
      6. Return the structured dict plus lightweight metadata.
    """
    from app.schemas.extraction import (
        ExtractionResult, BankTransaction, EMIPayment,
        OtherSpending, CapitalGains, DocumentMetadata,
    )

    raw = _extract_raw(file_path, filename)
    text = raw.text or ""

    # Determine parse status
    if raw.parse_error and not text.strip():
        doc_status = "failed"
    elif raw.parse_error or len(text.strip()) < 20:
        doc_status = "partial"
    else:
        doc_status = "parsed"

    doc_type = _classify_document(text) if text.strip() else "Unknown"

    # ── Field extraction ──────────────────────────────────────────────────
    salary          = _extract_salary(text)           if doc_status != "failed" else None
    rent_paid       = _extract_rent(text)             if doc_status != "failed" else None
    interest_income = _extract_interest_income(text)  if doc_status != "failed" else None
    annual_savings  = _extract_annual_savings(text)   if doc_status != "failed" else None
    cap_gains_raw   = _extract_capital_gains(text)    if doc_status != "failed" else {"stocks": None, "mutual_funds": None}

    # Bank transactions — prefer CSV row-based parser when available
    if raw.csv_rows:
        txn_dicts = _parse_csv_transactions(raw.csv_rows)
    else:
        txn_dicts = _extract_bank_transactions(text, raw.tables)

    emi_dicts      = _extract_emi_payments(text, raw.tables) if doc_status != "failed" else []
    spending_dicts = _extract_other_spendings(text, raw.tables) if doc_status != "failed" else []

    # ── Build typed schema objects ─────────────────────────────────────────
    bank_transactions = [
        BankTransaction(**t) for t in txn_dicts
    ]
    emi_payments = [
        EMIPayment(**e) for e in emi_dicts
    ]
    other_spendings = [
        OtherSpending(**s) for s in spending_dicts
    ]
    capital_gains = CapitalGains(
        stocks=cap_gains_raw["stocks"],
        mutual_funds=cap_gains_raw["mutual_funds"],
    )
    metadata = DocumentMetadata(document_type=doc_type, status=doc_status)

    result = ExtractionResult(
        salary=salary,
        bank_transactions=bank_transactions,
        rent_paid=rent_paid,
        emi_payments=emi_payments,
        interest_income=interest_income,
        capital_gains=capital_gains,
        annual_savings=annual_savings,
        other_spendings=other_spendings,
        document_metadata=[metadata],
    )

    # ── Privacy: delete raw file from disk ────────────────────────────────
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        deleted_from_disk = True
    except Exception as del_err:
        logger.warning("Could not delete uploaded file %s: %s", file_path, del_err)
        deleted_from_disk = False

    return {
        "filename": filename,
        "status": doc_status,
        "document_type": doc_type,
        "deleted_from_disk": deleted_from_disk,
        "extraction": result.model_dump(),
    }
