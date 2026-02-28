/**
 * BreadMath.ts
 * Motor de cálculos técnicos para panificação artesanal.
 * Implementa Baker's Percentage e Lógica de Hidratação.
 */

export interface DoughRecipe {
  flour: number;      // gramas
  water: number;      // gramas
  salt: number;       // gramas
  starter: number;    // gramas (levain/starter)
}

export interface BakerProportions {
  hydration: number;  // %
  saltRatio: number;   // %
  starterRatio: number; // %
}

export class BreadMath {
  /**
   * Calcula a porcentagem de padeiro baseada no peso da farinha.
   * @param totalFlour Peso total da farinha (100%)
   * @param componentWeight Peso do componente a calcular
   */
  static calculateBakerPercentage(totalFlour: number, componentWeight: number): number {
    const safeTotal = Math.max(0, totalFlour);
    const safeComponent = Math.max(0, componentWeight);
    if (safeTotal <= 0) return 0;
    return (safeComponent / safeTotal) * 100;
  }

  /**
   * Calcula as proporções completas de uma receita.
   */
  static getRecipeProportions(recipe: DoughRecipe): BakerProportions {
    return {
      hydration: this.calculateBakerPercentage(recipe.flour, recipe.water),
      saltRatio: this.calculateBakerPercentage(recipe.flour, recipe.salt),
      starterRatio: this.calculateBakerPercentage(recipe.flour, recipe.starter)
    };
  }

  /**
   * Calcula o peso necessário de água para atingir uma hidratação alvo.
   */
  static calculateWaterForHydration(flourWeight: number, targetHydration: number): number {
    const safeFlour = Math.max(0, flourWeight);
    const safeHydration = Math.max(0, targetHydration);
    return (safeFlour * safeHydration) / 100;
  }

  /**
   * Ajusta a hidratação final considerando a água presente no fermento (starter).
   * Assume-se que o starter é 100% hidratação (50/50 água/farinha).
   */
  static calculateRealHydration(recipe: DoughRecipe): number {
    const safeFlour = Math.max(0, recipe.flour);
    const safeWater = Math.max(0, recipe.water);
    const safeStarter = Math.max(0, recipe.starter);

    const starterFlour = safeStarter / 2;
    const starterWater = safeStarter / 2;
    const totalFlour = safeFlour + starterFlour;
    const totalWater = safeWater + starterWater;
    
    return this.calculateBakerPercentage(totalFlour, totalWater);
  }
}
