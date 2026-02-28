/**
 * NutriEngine.ts
 * Motor de inteligência nutricional e bioquímica dos alimentos.
 * Focado em digestibilidade, impacto glicêmico e densidade nutricional.
 */

export interface NutritionProfile {
  digestibilityScore: number; // 0-100 (100 = máxima quebra de fitatos/glúten)
  glycemicIndexCategory: 'Low' | 'Medium' | 'High';
  mineralDensity: 'Low' | 'Medium' | 'High';
  healthBenefits: string[];
}

export class NutriEngine {
  /**
   * Calcula o score de digestibilidade baseado no tempo e tipo de fermentação.
   * A fermentação longa (Sourdough) quebra o ácido fítico e pré-digere o glúten.
   */
  static calculateDigestibility(hours: number, isSourdough: boolean): number {
    if (hours <= 0) return 0;
    
    let score = 20; // Base para fermentação biológica rápida (1-2h)
    
    if (isSourdough) score += 30; // Bônus de fermentação natural
    
    // Curva de quebra enzimática (simplificada)
    if (hours >= 12) score += 20;
    if (hours >= 24) score += 20;
    if (hours >= 48) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Analisa o impacto glicêmico baseado no blend de farinhas.
   */
  static analyzeGlycemicImpact(wholeGrainPercent: number, fermentationHours: number): 'Low' | 'Medium' | 'High' {
    const safeHours = Math.max(0, fermentationHours);
    const safeGrain = Math.min(100, Math.max(0, wholeGrainPercent));

    // Farinha branca refinada + fermentação rápida = High
    if (safeGrain < 30 && safeHours < 12) return 'High';
    
    // Mais de 50% integral ou fermentação longa (acidez reduz IG) = Low
    if (safeGrain > 50 || safeHours > 24) return 'Low';
    
    return 'Medium';
  }

  /**
   * Sugere "Boosters" nutricionais baseados no perfil da receita.
   */
  static suggestNutritionalBoosters(flourType: string): string[] {
    const boosters = [];
    if (flourType === '00' || flourType === 'Tipo 1') {
      boosters.push('Adicionar 5% de sementes de girassol para Magnésio.');
      boosters.push('Incluir sementes de linhaça hidratadas para Ômega-3 e Fibras.');
    }
    return boosters;
  }

  /**
   * Gera o perfil nutricional completo da fornada.
   */
  static getBatchHealthProfile(hours: number, wholeGrainPercent: number, isSourdough: boolean): NutritionProfile {
    const digestibility = this.calculateDigestibility(hours, isSourdough);
    const gi = this.analyzeGlycemicImpact(wholeGrainPercent, hours);
    
    const benefits = [];
    if (digestibility > 70) benefits.push('Alta digestibilidade (glúten pré-digerido)');
    if (gi === 'Low') benefits.push('Liberação lenta de energia (Baixo IG)');
    if (isSourdough) benefits.push('Presença de ácidos orgânicos benéficos');

    return {
      digestibilityScore: digestibility,
      glycemicIndexCategory: gi,
      mineralDensity: wholeGrainPercent > 30 ? 'High' : 'Medium',
      healthBenefits: benefits
    };
  }
}
