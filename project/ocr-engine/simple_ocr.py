#!/usr/bin/env python3
"""
REAL OCR Script for Backend Integration
Uses actual EasyOCR + Museum OCR pipeline for real text extraction
"""

import sys
import json
import os
import time
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import logging

# Optional pytesseract fallback (requires Tesseract OCR installed on system)
try:
    import pytesseract  # type: ignore
    PYTESS_AVAILABLE = True
except Exception:
    PYTESS_AVAILABLE = False

# Try to import EasyOCR for real OCR
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def initialize_ocr_readers():
    """Initialize EasyOCR readers for Hindi and English"""
    if not EASYOCR_AVAILABLE:
        return None, None
    
    try:
        logger.info("🚀 Initializing EasyOCR readers...")
        hindi_reader = easyocr.Reader(['hi'], gpu=False)
        english_reader = easyocr.Reader(['en'], gpu=False)
        logger.info("✅ EasyOCR readers initialized successfully")
        return hindi_reader, english_reader
    except Exception as e:
        logger.error(f"❌ Failed to initialize EasyOCR: {e}")
        return None, None

def preprocess_image(image_path):
    """Enhanced image preprocessing for better OCR results"""
    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE for better contrast
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
        
        # Sharpen
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        logger.info("✅ Image preprocessing completed")
        return sharpened
        
    except Exception as e:
        logger.error(f"❌ Image preprocessing failed: {e}")
        return None

def perform_real_ocr(image_path, hindi_reader, english_reader):
    """Perform real OCR using EasyOCR"""
    try:
        logger.info(f"🔍 Performing real OCR on: {image_path}")
        
        # Preprocess image
        processed_image = preprocess_image(image_path)
        if processed_image is None:
            return None
        
        hindi_text = ""
        english_text = ""
        all_text = []
        
        # Try Hindi OCR first
        if hindi_reader:
            try:
                logger.info("🔍 Running Hindi OCR...")
                hindi_results = hindi_reader.readtext(processed_image)
                hindi_text = " ".join([result[1] for result in hindi_results])
                logger.info(f"✅ Hindi OCR found: {len(hindi_results)} text blocks")
            except Exception as e:
                logger.error(f"❌ Hindi OCR failed: {e}")
        
        # Try English OCR
        if english_reader:
            try:
                logger.info("🔍 Running English OCR...")
                english_results = english_reader.readtext(processed_image)
                english_text = " ".join([result[1] for result in english_results])
                logger.info(f"✅ English OCR found: {len(english_results)} text blocks")
            except Exception as e:
                logger.error(f"❌ English OCR failed: {e}")
        
        # Combine all text
        if hindi_text:
            all_text.append(f"[HINDI] {hindi_text}")
        if english_text:
            all_text.append(f"[ENGLISH] {english_text}")
        
        combined_text = "\n\n".join(all_text) if all_text else ""
        
        # Calculate confidence (average of all detections)
        all_results = []
        if hindi_reader:
            try:
                hindi_results = hindi_reader.readtext(processed_image)
                all_results.extend([result[2] for result in hindi_results])
            except:
                pass
        
        if english_reader:
            try:
                english_results = english_reader.readtext(processed_image)
                all_results.extend([result[2] for result in english_results])
            except:
                pass
        
        confidence = np.mean(all_results) if all_results else 0.0

        # Fallback: if EasyOCR produced no text, try pytesseract if available
        if (not combined_text.strip()) and PYTESS_AVAILABLE:
            try:
                logger.info("🔄 EasyOCR empty; attempting pytesseract fallback...")
                # Read original image for pytesseract (works better with original or lightly processed)
                img = cv2.imread(image_path)
                if img is None:
                    raise ValueError(f"Could not load image: {image_path}")
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Light threshold to improve contrast
                thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
                # Prefer hindi+english if language data present; if not, default to english
                try_lang = 'eng+hin'
                try:
                    raw_text = pytesseract.image_to_string(thr, lang=try_lang)
                except Exception:
                    raw_text = pytesseract.image_to_string(thr, lang='eng')

                cleaned = (raw_text or '').strip()
                if cleaned:
                    combined_text = cleaned
                    hindi_text = ''  # unknown split; provide as combined
                    english_text = cleaned
                    # Heuristic confidence based on length
                    confidence = min(0.95, max(0.3, len(cleaned) / 500.0))
                    all_results = [confidence]
                    logger.info("✅ pytesseract fallback produced text (%d chars)", len(cleaned))
            except Exception as e:
                logger.error(f"❌ pytesseract fallback failed: {e}")
        
        logger.info(f"✅ Real OCR completed - Hindi: {len(hindi_text)} chars, English: {len(english_text)} chars")
        
        return {
            "hindi_text": hindi_text,
            "english_text": english_text,
            "combined_text": combined_text,
            "confidence": confidence,
            "text_blocks_found": len(all_results)
        }
        
    except Exception as e:
        logger.error(f"❌ Real OCR failed: {e}")
        return None

def process_image_with_real_ocr(image_path):
    """Main OCR processing with REAL OCR engine"""
    try:
        start_time = time.time()
        logger.info(f"🔍 Processing image with REAL OCR: {image_path}")
        
        # Check file size
        file_size = os.path.getsize(image_path)
        logger.info(f"📊 File size: {file_size} bytes")
        
        # Initialize OCR readers
        hindi_reader, english_reader = initialize_ocr_readers()
        
        if not hindi_reader and not english_reader:
            logger.error("❌ No OCR readers available")
            return {
                "success": False,
                "error": "No OCR engines available. Please install EasyOCR: pip install easyocr",
                "text": "",
                "hindi_text": "",
                "english_text": "",
                "confidence": 0.0,
                "processing_time": 0.0,
                "zones_count": 0
            }
        
        # Perform real OCR
        ocr_result = perform_real_ocr(image_path, hindi_reader, english_reader)
        
        if ocr_result is None:
            return {
                "success": False,
                "error": "OCR processing failed",
                "text": "",
                "hindi_text": "",
                "english_text": "",
                "confidence": 0.0,
                "processing_time": 0.0,
                "zones_count": 0
            }
        
        processing_time = time.time() - start_time
        
        # Prepare result
        result = {
            "success": True,
            "text": ocr_result["combined_text"],
            "hindi_text": ocr_result["hindi_text"],
            "english_text": ocr_result["english_text"],
            "confidence": ocr_result["confidence"],
            "processing_time": processing_time,
            "zones_count": ocr_result["text_blocks_found"],
            "ocr_engine": "EasyOCR (Real)"
        }
        
        logger.info(f"REAL OCR processing completed in {processing_time:.2f}s")
        logger.info(f"Confidence: {ocr_result['confidence']:.2%}")
        logger.info(f"Text blocks found: {ocr_result['text_blocks_found']}")
        
        return result
        
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "hindi_text": "",
            "english_text": "",
            "confidence": 0.0,
            "processing_time": 0.0,
            "text_blocks_found": 0
        }

def main():
    """Main function for testing and backend integration"""
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python simple_ocr.py <image_path>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = process_image_with_real_ocr(image_path)
    
    # Print JSON result with ASCII encoding to avoid Unicode issues
    print(json.dumps(result, ensure_ascii=True))

if __name__ == "__main__":
    main() 