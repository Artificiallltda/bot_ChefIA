import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';

export class AIEngine {
    private client: OpenAI;
    private static knowledgeCache: string | null = null;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    private getKnowledgeContext(): string {
        if (AIEngine.knowledgeCache) return AIEngine.knowledgeCache;

        const kbPath = path.join(__dirname, '../../knowledge');
        let context = '--- CONHECIMENTO TÉCNICO DO CHEFIA ---\n';
        
        if (fs.existsSync(kbPath)) {
            const files = fs.readdirSync(kbPath);
            files.forEach(file => {
                if (file.endsWith('.md')) {
                    context += fs.readFileSync(path.join(kbPath, file), 'utf-8') + '\n\n';
                }
            });
        }
        
        AIEngine.knowledgeCache = context;
        return context;
    }

    async generateResponse(userMessage: string, history: any[]) {
        const systemPrompt = "Você é o ChefIA, seu mentor de gastronomia técnica.\n\n" + this.getKnowledgeContext();
        // Lógica de chamada OpenAI aqui no futuro...
        return "Simulação de Resposta do ChefIA";
    }
}
