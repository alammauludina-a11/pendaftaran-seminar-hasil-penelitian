import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(ai: GoogleGenAI, prompt: string, maxRetries = 3): Promise<string> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const resultText = response.text;
      if (!resultText) throw new Error("Empty response from Gemini");
      return resultText;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.status === 503 || err?.code === 503 ||
        (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('high demand')));
      
      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s
        console.warn(`Gemini 503 on attempt ${attempt}, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY is not set in environment variables. Silakan tambahkan di .env.local' 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
Anda adalah asisten yang membantu admin program studi membaca pola umum dari daftar judul tugas akhir mahasiswa berikut. Ini BUKAN alat pengukuran kemiripan yang presisi — tugas Anda hanya memberikan observasi kualitatif awal yang bisa jadi bahan diskusi lebih lanjut oleh manusia.

Jika daftar judul di atas kosong (tidak ada data), berikan respons (di dalam field "titles") dengan persis kalimat ini: "Belum ada mahasiswa yang selesai Seminar Hasil Penelitian, sehingga analisis judul belum bisa dilakukan." dan JANGAN berikan analisis lainnya.

Jika daftar judul tidak kosong, buatlah ringkasan (maksimal 3 paragraf) dengan bahasa Indonesia yang santai, lugas, dan mudah dipahami (hindari bahasa akademis yang kaku).

Dalam ringkasan ini, sampaikan:
1. Apakah ada beberapa judul yang tampak mengangkat tema atau topik serupa, dan sebutkan tema tersebut secara umum (tanpa menyebut angka atau persentase pasti, karena Anda tidak melakukan perhitungan kemiripan numerik apa pun).
2. Judul-judul mana yang terlihat menonjol karena pendekatan atau topiknya berbeda dari mayoritas.
3. 1–2 tren topik yang paling sering muncul, dijelaskan secara deskriptif.

ATURAN PENTING:
- JANGAN menyebutkan angka, persentase, atau perkiraan kuantitatif apa pun (misalnya "40% mahasiswa...", "sekitar 5 judul..."), karena Anda hanya membaca judul secara tekstual, bukan menghitung kemiripan secara matematis. Gunakan kata seperti "beberapa", "sebagian kecil", "cukup banyak" jika perlu menggambarkan proporsi secara kasar.
- Jangan mengklaim kepastian ("judul A dan B pasti mirip") — gunakan bahasa dugaan ("judul A dan B tampak membahas topik yang berdekatan").
- Fokus pada pola tema/topik, bukan kesamaan struktur kalimat atau gaya penulisan judul.

Daftar judul:
${JSON.stringify(data.titles, null, 2)}

Format response harus tepat dalam bentuk JSON murni dengan format seperti ini:
{
  "titles": "Isi analisis judul (bisa pakai markdown formatting seperti **bold**)..."
}
`;

    const resultText = await generateWithRetry(ai, prompt);
    const parsed = JSON.parse(resultText);
    
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Extract a user-friendly message from various error shapes
    let friendlyMessage = 'Terjadi kesalahan saat menghubungi Gemini API.';
    
    const rawMessage: string = error?.message || '';
    const errorObj = error?.error || error;
    const code = errorObj?.code || error?.status;
    const status = errorObj?.status || '';
    
    if (code === 503 || status === 'UNAVAILABLE' || rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand')) {
      friendlyMessage = 'Server AI sedang mengalami beban tinggi. Silakan coba lagi dalam beberapa saat.';
    } else if (code === 429 || status === 'RESOURCE_EXHAUSTED' || rawMessage.includes('429') || rawMessage.includes('quota')) {
      friendlyMessage = 'Batas penggunaan API Gemini tercapai. Silakan coba lagi nanti.';
    } else if (code === 400 || status === 'INVALID_ARGUMENT') {
      friendlyMessage = 'Permintaan tidak valid. Pastikan data yang dikirim sudah benar.';
    } else if (rawMessage.includes('API key') || rawMessage.includes('GEMINI_API_KEY')) {
      friendlyMessage = 'API Key Gemini tidak valid atau belum dikonfigurasi.';
    } else if (rawMessage) {
      friendlyMessage = rawMessage;
    }
    
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
