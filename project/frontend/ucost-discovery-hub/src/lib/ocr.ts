import { getApiUrl } from './desktop-config';

const API_BASE_URL = getApiUrl();

export interface DescribeImageResponse {
  success: boolean;
  text: string;
  confidence: number;
  processing_time: number;
  enhanced: {
    englishFinal: string;
    hindiFinal: string;
  };
  raw_ocr: {
    hindi_text: string;
    english_text: string;
    zones_count: number;
  };
}

export async function describeFromImage(imageFile: File): Promise<DescribeImageResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${API_BASE_URL}/ocr/describe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
} 