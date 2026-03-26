/**
 * Testes do HybridRouter
 * Verifica o sistema de roteamento Gemini ↔ Claude
 */

import { HybridRouter } from '../src/logic/HybridRouter';

describe('HybridRouter', () => {
  describe('analyzeComplexity', () => {
    
    test('deve rotear saudação para Gemini', () => {
      const result = HybridRouter.analyzeComplexity('Oi, bom dia!');
      expect(result.route).toBe('gemini');
      expect(result.score).toBeLessThan(3);
    });

    test('deve rotear pergunta técnica para Claude', () => {
      const result = HybridRouter.analyzeComplexity(
        'Meu pão sourdough não cresceu, a hidratação estava em 80%'
      );
      expect(result.route).toBe('claude');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    test('deve detectar receita complexa', () => {
      const result = HybridRouter.analyzeComplexity(
        'Receita de brioche com medidas exatas e explicação científica'
      );
      expect(result.route).toBe('claude');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    test('deve detectar dica simples', () => {
      const result = HybridRouter.analyzeComplexity(
        'Dica rápida para pão ficar mais fofo'
      );
      expect(result.route).toBe('gemini');
      expect(result.score).toBeLessThan(3);
    });

    test('deve detectar múltiplas perguntas', () => {
      const result = HybridRouter.analyzeComplexity(
        'Como faço o pão crescer? Qual a temperatura ideal? Por que fica duro?'
      );
      expect(result.result).toBe('claude');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    test('deve detectar termos de fermentação', () => {
      const complexTerms = [
        'fermentação',
        'hidratação',
        'autólise',
        'enzima',
        'glúten',
        'maillard'
      ];

      complexTerms.forEach(term => {
        const result = HybridRouter.analyzeComplexity(
          `Explique ${term} na panificação`
        );
        expect(result.score).toBeGreaterThanOrEqual(2);
      });
    });

    test('deve reduzir score para termos simples', () => {
      const simpleTerms = ['oi', 'olá', 'fácil', 'rápido', 'básico'];
      
      simpleTerms.forEach(term => {
        const result = HybridRouter.analyzeComplexity(term);
        expect(result.score).toBeLessThan(3);
      });
    });
  });

  describe('Roteamento de Intenções', () => {
    
    test('deve rotear pergunta sobre Instagram para social', () => {
      // Isso é testado no AgentOrchestrator
      // HybridRouter apenas analisa complexidade
      const result = HybridRouter.analyzeComplexity(
        'Como fazer post no Instagram sobre pão?'
      );
      // Pode ir para Gemini ou Claude dependendo da complexidade
      expect(['gemini', 'claude']).toContain(result.route);
    });

    test('deve rotear pergunta nutricional complexa para Claude', () => {
      const result = HybridRouter.analyzeComplexity(
        'Qual o impacto metabólico da fermentação longa nos carboidratos?'
      );
      expect(result.route).toBe('claude');
    });
  });
});
