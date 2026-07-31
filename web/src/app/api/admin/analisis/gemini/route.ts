import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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
Anda adalah seorang konsultan akademik yang sedang memberikan ringkasan kepada pimpinan kampus. Berikut adalah daftar judul penelitian terakhir dari para mahasiswa:

${JSON.stringify(data.titles, null, 2)}

Jika daftar judul di atas kosong (tidak ada data), berikan respons (di dalam field "titles") dengan persis kalimat ini: "Belum ada mahasiswa yang selesai Seminar Hasil Penelitian, sehingga analisis judul belum bisa dilakukan." dan JANGAN berikan analisis lainnya.

Jika daftar judul tidak kosong, buatlah analisis (maksimal 3 paragraf) dengan bahasa Indonesia yang santai, lugas, dan sangat mudah dipahami (hindari bahasa akademis yang terlalu kaku).

Di dalam analisis ini, Anda WAJIB memberikan KUANTIFIKASI (seperti perkiraan persentase atau jumlah) untuk menggambarkan hal-hal berikut:
1. Sejauh mana tingkat kesamaan atau kemiripan dari judul-judul tersebut (misalnya: "Sekitar 40% mahasiswa masih mengambil topik yang serupa...").
2. Seberapa banyak judul yang dianggap sangat unik atau memiliki inovasi baru.
3. Sebutkan 1 atau 2 tren topik utama yang paling mendominasi.

Format response harus tepat dalam bentuk JSON murni dengan format seperti ini:
{
  "titles": "Isi analisis judul (bisa pakai markdown formatting seperti **bold**)..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(resultText);
    
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat menghubungi Gemini API' }, { status: 500 });
  }
}
