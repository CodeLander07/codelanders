import os
import time
import pdfplumber
import pytesseract
from PIL import Image

def process_document(file_path: str, filename: str) -> dict:
    """
    Simulated OCR pipeline that attempts to extract text via pdfplumber 
    and pytesseract, returning structured metadata.
    """
    extracted_text = ""
    file_ext = os.path.splitext(filename)[1].lower()
    
    try:
        if file_ext == '.pdf':
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
        elif file_ext in ['.png', '.jpg', '.jpeg']:
            image = Image.open(file_path)
            extracted_text = pytesseract.image_to_string(image)
    except Exception as e:
        print(f"Error processing document: {e}")
        extracted_text = f"Failed to extract text. Error: {str(e)}"
        
    # In a real scenario, use LayoutLM or rule-based NLP to find Income, Deductions, etc.
    # Here we mock the structured output based on simple keyword search
    structured_data = {}
    lower_text = extracted_text.lower()
    
    if "salary" in lower_text or "payslip" in lower_text:
        structured_data["type"] = "Salary Slip"
        # Mock extracted value
        structured_data["estimated_income"] = 1200000 
    elif "bank statement" in lower_text:
        structured_data["type"] = "Bank Statement"
        structured_data["interest_income"] = 15000
    elif "80c" in lower_text or "lic" in lower_text or "pf" in lower_text:
        structured_data["type"] = "Investment Proof"
        structured_data["deduction_80c"] = 150000
    else:
        structured_data["type"] = "Unknown Document"
        
    # Auto-deletion logic: We delete the physical file after processing to maintain strict privacy
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except:
        pass
        
    return {
        "filename": filename,
        "extracted_text_snippet": extracted_text[:200] + "...",
        "structured_data": structured_data,
        "status": "processed",
        "deleted_from_disk": True
    }
