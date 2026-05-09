import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface OcrResult {
  vendor: string | null;
  date: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  currency: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

const PROMPT = `
Bu fiş veya fatura görselini analiz et ve YALNIZCA aşağıdaki JSON yapısını döndür.
Başka hiçbir metin, açıklama veya markdown yazma. Sadece JSON objesi.

{
  "vendor": "mağaza/şirket adı veya null",
  "date": "YYYY-MM-DD formatında tarih veya null",
  "subtotal": KDV hariç tutar (sayı) veya null,
  "taxAmount": KDV tutarı (sayı) veya null,
  "total": toplam tutar (sayı) veya null,
  "currency": "TRY",
  "category": "OFFICE | SOFTWARE | FOOD | TRANSPORT | UTILITY | OTHER",
  "confidence": "high | medium | low"
}

Kurallar:
- Tutarlar sayısal olmalı (string değil): 847.50
- Tarih YYYY-MM-DD formatında olmalı
- Görsel okunamazsa tüm alanları null yap, confidence: "low"
- Kategori tahmini: market/yemek→FOOD, yazılım/abonelik→SOFTWARE, ulaşım→TRANSPORT, fatura/aidat→UTILITY, ofis→OFFICE, diğer→OTHER
`.trim();

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;

  constructor(config: ConfigService) {
    this.groq = new Groq({
      apiKey: config.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  async processReceipt(imageUrl: string): Promise<OcrResult> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const imageData = await this.fetchImageAsBase64(imageUrl);

        const response = await this.groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageData}` },
                },
                { type: 'text', text: PROMPT },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 512,
        });

        const text = response.choices[0]?.message?.content ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('JSON bulunamadı');

        const parsed: OcrResult = JSON.parse(jsonMatch[0]);
        this.logger.log(`OCR tamamlandı — confidence: ${parsed.confidence}`);
        return parsed;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`OCR denemesi ${attempt + 1} başarısız: ${msg}`);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return {
      vendor: null, date: null, subtotal: null,
      taxAmount: null, total: null,
      currency: 'TRY', category: 'OTHER', confidence: 'low',
    };
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
