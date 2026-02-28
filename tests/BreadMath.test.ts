import { BreadMath, DoughRecipe } from '../src/logic/BreadMath';

describe('BreadMath Logic', () => {
  const basicRecipe: DoughRecipe = {
    flour: 500,
    water: 350,
    salt: 10,
    starter: 100
  };

  test('should calculate correct baker percentage for salt', () => {
    const saltPercent = BreadMath.calculateBakerPercentage(500, 10);
    expect(saltPercent).toBe(2);
  });

  test('should calculate correct hydration ratio', () => {
    const props = BreadMath.getRecipeProportions(basicRecipe);
    expect(props.hydration).toBe(70);
  });

  test('should calculate real hydration considering starter water/flour', () => {
    // 500 flour + 50 (from starter) = 550 total flour
    // 350 water + 50 (from starter) = 400 total water
    // (400 / 550) * 100 = 72.72...
    const realHydration = BreadMath.calculateRealHydration(basicRecipe);
    expect(realHydration).toBeCloseTo(72.72, 1);
  });

  test('should suggest correct water for target hydration', () => {
    const targetWater = BreadMath.calculateWaterForHydration(1000, 75);
    expect(targetWater).toBe(750);
  });
});
