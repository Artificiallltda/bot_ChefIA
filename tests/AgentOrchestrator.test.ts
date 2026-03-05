/**
 * AgentOrchestrator.test.ts
 * Testa a deteccao de intencao sem chamar APIs reais.
 */

import { AgentOrchestrator } from '../src/logic/AgentOrchestrator';

jest.mock('../src/logic/agents/ChefWriter', () => ({
    ChefWriter: { respond: jest.fn().mockResolvedValue('Resposta ChefWriter') }
}));
jest.mock('../src/logic/agents/Nutritionist', () => ({
    Nutritionist: { respond: jest.fn().mockResolvedValue('Resposta Nutritionist') }
}));
jest.mock('../src/logic/agents/SocialAgent', () => ({
    SocialAgent: { respond: jest.fn().mockResolvedValue('Resposta SocialAgent') }
}));
jest.mock('../src/logic/AIEngine', () => ({
    AIEngine: { generateResponse: jest.fn().mockResolvedValue('Resposta Geral') }
}));

import { ChefWriter } from '../src/logic/agents/ChefWriter';
import { Nutritionist } from '../src/logic/agents/Nutritionist';
import { SocialAgent } from '../src/logic/agents/SocialAgent';
import { AIEngine } from '../src/logic/AIEngine';

beforeEach(() => jest.clearAllMocks());

describe('AgentOrchestrator — deteccao de intencao', () => {
    it('detecta tecnica para perguntas de receita', () => {
        expect(AgentOrchestrator.detectIntent('me da uma receita de sourdough')).toBe('tecnica');
        expect(AgentOrchestrator.detectIntent('como fazer fermento natural')).toBe('tecnica');
        expect(AgentOrchestrator.detectIntent('qual a hidratacao ideal do pao')).toBe('tecnica');
    });

    it('detecta nutricao para perguntas de macros e dietas', () => {
        expect(AgentOrchestrator.detectIntent('quantas calorias tem isso')).toBe('nutricao');
        expect(AgentOrchestrator.detectIntent('tem versao vegana?')).toBe('nutricao');
        expect(AgentOrchestrator.detectIntent('pode ser sem gluten?')).toBe('nutricao');
    });

    it('detecta social para perguntas de instagram e posts', () => {
        expect(AgentOrchestrator.detectIntent('cria uma legenda pro instagram')).toBe('social');
        expect(AgentOrchestrator.detectIntent('quero um post para o tiktok')).toBe('social');
        expect(AgentOrchestrator.detectIntent('gera hashtags para o reel')).toBe('social');
    });

    it('detecta misto para perguntas que combinam temas', () => {
        expect(AgentOrchestrator.detectIntent('receita de pao com quantas calorias')).toBe('misto');
        expect(AgentOrchestrator.detectIntent('post para instagram da receita sourdough')).toBe('misto');
    });

    it('detecta geral para perguntas sem palavras-chave', () => {
        expect(AgentOrchestrator.detectIntent('oi tudo bem?')).toBe('geral');
        expect(AgentOrchestrator.detectIntent('me conta sobre voce')).toBe('geral');
    });
});

describe('AgentOrchestrator — roteamento de agentes', () => {
    const history: any[] = [];

    it('chama ChefWriter para intencao tecnica', async () => {
        await AgentOrchestrator.process('Teste', 'receita de sourdough', history);
        expect(ChefWriter.respond).toHaveBeenCalled();
        expect(Nutritionist.respond).not.toHaveBeenCalled();
    });

    it('chama Nutritionist para intencao nutricao', async () => {
        await AgentOrchestrator.process('Teste', 'quantas calorias tem?', history);
        expect(Nutritionist.respond).toHaveBeenCalled();
        expect(ChefWriter.respond).not.toHaveBeenCalled();
    });

    it('chama SocialAgent para intencao social', async () => {
        await AgentOrchestrator.process('Teste', 'cria legenda para instagram', history);
        expect(SocialAgent.respond).toHaveBeenCalled();
    });

    it('chama AIEngine para intencao geral', async () => {
        await AgentOrchestrator.process('Teste', 'oi tudo bem?', history);
        expect(AIEngine.generateResponse).toHaveBeenCalled();
    });
});
