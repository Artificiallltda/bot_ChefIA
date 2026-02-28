import { NutriEngine } from '../src/logic/NutriEngine';
import { ZeroWasteEngine, ScrapItem } from '../src/logic/ZeroWasteEngine';

describe('NutriEngine Logic', () => {
  test('should calculate digestibility correctly', () => {
    // 2h, No sourdough = 20
    expect(NutriEngine.calculateDigestibility(2, false)).toBe(20);
    // 24h, Sourdough = 20 + 30 + 20 + 20 = 90
    expect(NutriEngine.calculateDigestibility(24, true)).toBe(90);
  });

  test('should handle zero or negative hours in NutriEngine', () => {
    expect(NutriEngine.calculateDigestibility(0, true)).toBe(0);
    expect(NutriEngine.calculateDigestibility(-5, true)).toBe(0);
  });

  test('should analyze glycemic impact correctly', () => {
    // Refined (<30%) + fast (<12h) = High
    expect(NutriEngine.analyzeGlycemicImpact(20, 10)).toBe('High');
    // High grain (>50%) = Low
    expect(NutriEngine.analyzeGlycemicImpact(60, 2)).toBe('Low');
    // Long fermentation (>24h) = Low
    expect(NutriEngine.analyzeGlycemicImpact(10, 30)).toBe('Low');
  });
});

describe('ZeroWasteEngine Logic', () => {
  test('should find known suggestions case-insensitively', () => {
    const suggestion = ZeroWasteEngine.getSuggestionsFor('sourdough discard');
    expect(suggestion?.suggestion).toContain('Crackers');
  });

  test('should provide generic fallback for unknown items', () => {
    const items: ScrapItem[] = [
      { name: 'Mystery Veggie', type: 'Peel', source: 'AlienSquash' }
    ];
    const results = ZeroWasteEngine.analyzeInventory(items);
    expect(results[0].suggestion).toBe('Base Aromática para Caldo de Legumes');
  });

  test('should analyze inventory with mixed items', () => {
    const items: ScrapItem[] = [
      { name: 'Pumpkin', type: 'Peel', source: 'Pumpkin' },
      { name: 'Unknown', type: 'Seed', source: 'Whatever' }
    ];
    const results = ZeroWasteEngine.analyzeInventory(items);
    expect(results.length).toBe(2);
    expect(results[0].suggestion).toContain('Chips');
    expect(results[1].suggestion).toContain('Base Aromática');
  });
});
