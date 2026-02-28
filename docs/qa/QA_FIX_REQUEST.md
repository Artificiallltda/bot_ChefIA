# QA Fix Request: Blindagem Técnica do ChefIA Core

---

## 🛑 Críticos: Segurança dos Cálculos (Segurança)
**Local:** `BreadMath.ts` e `NutriEngine.ts`

- [x] **Validação de Inputs:** Implementar guarda para evitar valores negativos em pesos (farinha, água, sal) e tempo de fermentação. Use `Math.max(0, value)`.
- [x] **Proteção de Divisão por Zero:** Garantir que o `totalFlour` no método `calculateRealHydration` nunca seja zero, evitando retornos de `NaN` ou `Infinity`.
- [x] **Paradoxo Temporal:** O `NutriEngine` deve retornar score `0` para tempos de fermentação negativos ou iguais a zero.

## ⚠️ Consistência da Base de Conhecimento (Consistência)
**Local:** `ZeroWasteEngine.ts` e `FlourRegistry.ts`

- [x] **Case Insensitivity:** No `ZeroWasteEngine`, as chaves do dicionário devem ser normalizadas (lowercase) e as buscas devem ignorar maiúsculas/minúsculas.
- [x] **Fuzzy Search Básico:** Implementar uma normalização simples para inputs do usuário (ex: remover espaços extras) antes da busca.
- [x] **Fallback de Resposta:** No `ZeroWasteEngine.analyzeInventory`, caso nenhum item seja encontrado, retornar uma sugestão genérica de "Caldo de Legumes/Base Aromática" para incentivar o uso integral mesmo de itens não catalogados.
- [x] **Metadados de Alerta:** No `FlourRegistry`, adicionar um campo `notes` ou `warning` para farinhas com baixo W (como a integral nacional), orientando sobre técnicas de dobras extras.

## 🧪 Validação Requerida
- [x] Rodar os testes unitários do Dex com os novos cenários de erro (Negative weights, Zero hours).
- [x] Garantir cobertura de 100% para os novos métodos de validação.

---
**Status Final:** ✅ Todos os itens corrigidos e validados via Jest em 2026-02-26.
— Quinn, guardião da qualidade 🛡️
