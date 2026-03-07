import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.2.6 - Deep Debug & Stable Vision)
 * Motor de visão com telemetria de erro para o Comandante.
 */
export class VisionEngine {
  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your-gemini-key-for-vision-here') {
      return 'ChefIA: Minha visão está desativada. O Comandante esqueceu de configurar a GEMINI_API_KEY no Railway!';
    }

    try {
      console.log(`[VisionEngine] Baixando imagem: ${imageUrl.substring(0, 50)}...`);
      
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Erro ao baixar imagem do Telegram (Status: ${response.status})`);
      
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`[VisionEngine] Imagem pronta (${base64Data.length} bytes). Acionando Gemini...`);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Você é o ChefIA, um Mentor Gastronômico. O usuário ${userName} enviou uma foto.
Analise os ingredientes e responda: "${input || 'O que posso fazer com isso?'}"
Seja técnico e direto. Responda em Português do Brasil.`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);

      const text = result.response.text();
      
      if (!text) throw new Error('O Gemini retornou uma resposta vazia.');

      return text;

    } catch (error: any) {
      console.error('[VisionEngine] ERRO REAL:', error);
      // Retornamos o erro real para o usuário poder nos dizer o que está acontecendo no terminal do Railway
      return `ChefIA (Erro Técnico): Não consegui analisar a foto. 
Motivo: ${error.message || 'Erro desconhecido'}
Dica: Verifique se a API Key no Railway está correta.`;
    }
  }
}
