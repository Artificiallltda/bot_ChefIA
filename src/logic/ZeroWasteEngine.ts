/**
 * ZeroWasteEngine.ts
 * Motor de sugestões para aproveitamento integral e receitas zero-waste.
 * Focado em nutrição consciente e economia circular.
 */

export interface ScrapItem {
  name: string;
  type: 'Peel' | 'Stalk' | 'Seed' | 'Discard' | 'Core'; // Casca, Talo, Semente, Descarte de Fermento, Miolo
  source: string; // Ex: Abóbora, Cenoura, Maçã, Sourdough
}

export interface ScrapSuggestion {
  originalScrap: string;
  suggestion: string;
  benefit: string;
  technique: string;
}

export class ZeroWasteEngine {
  private static suggestions: Record<string, ScrapSuggestion> = {
    'SourdoughDiscard': {
      originalScrap: 'Descarte de Fermento Natural',
      suggestion: 'Crackers de Ervas ou Panquecas de Fermento',
      benefit: 'Redução de desperdício e probióticos naturais.',
      technique: 'Misturar com farinha, azeite e sal para crackers crocantes.'
    },
    'PumpkinPeel': {
      originalScrap: 'Casca de Abóbora',
      suggestion: 'Chips de Casca de Abóbora ao Forno',
      benefit: 'Alta densidade de fibras e betacaroteno.',
      technique: 'Temperar com páprica, sal e azeite; assar até dourar.'
    },
    'CarrotStalk': {
      originalScrap: 'Talo de Cenoura',
      suggestion: 'Pesto de Talos de Cenoura',
      benefit: 'Rico em Vitamina A e Clorofila.',
      technique: 'Processar com castanhas, parmesão, azeite e alho.'
    },
    'BreadCrust': {
      originalScrap: 'Cascas de Pão Amanhecido',
      suggestion: 'Croutons ou Farinha de Rosca Caseira',
      benefit: 'Evita desperdício de carboidratos complexos.',
      technique: 'Cortar em cubos, temperar com ervas e secar no forno.'
    }
  };

  static getSuggestionsFor(itemName: string): ScrapSuggestion | undefined {
    const normalizedKey = itemName.toLowerCase().replace(/\s+/g, '');
    
    // Normalização das chaves do dicionário para lowercase
    const entries = Object.entries(this.suggestions);
    const match = entries.find(([key]) => key.toLowerCase() === normalizedKey);
    
    return match ? match[1] : undefined;
  }

  /**
   * Sugere preparos para uma lista de "descartes" informados pelo usuário.
   */
  static analyzeInventory(items: ScrapItem[]): ScrapSuggestion[] {
    const results: ScrapSuggestion[] = [];
    
    for (const item of items) {
      const suggestion = this.getSuggestionsFor(item.source + item.type) || 
                         this.getSuggestionsFor(item.source);
      
      if (suggestion) {
        results.push(suggestion);
      } else {
        // Fallback QA Request: Sugestão genérica de Caldo/Base Aromática
        results.push({
          originalScrap: item.name,
          suggestion: 'Base Aromática para Caldo de Legumes',
          benefit: 'Extração máxima de nutrientes e sabor residual.',
          technique: 'Ferver com água, cebola, alho e ervas por 40 minutos para criar um fundo de cozinha.'
        });
      }
    }
    
    return results;
  }
}
