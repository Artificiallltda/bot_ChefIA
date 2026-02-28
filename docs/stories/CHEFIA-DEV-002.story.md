# Story: CHEFIA-DEV-002 — Interface de Voz Multicanal (WA/TG)

---

## Status
**Current:** Completed
**Sprint:** Sprint 1 - Foundation

---

## Story
Como um mentor gastronômico, eu quero ser capaz de receber mensagens via WhatsApp e Telegram para que eu possa responder dúvidas técnicas de panificação e nutrição em tempo real.

## Acceptance Criteria
- [x] Implementar `MessengerAdapter` abstrato para suportar múltiplos canais.
- [x] Criar `TelegramProvider` funcional usando a API de Bots do Telegram (Mock/Foundation).
- [x] Criar `WhatsAppAdapter` (Mock/Webhook) preparado para integração com provedores (Evolution/Twilio).
- [x] Implementar `ChefRouter` para encaminhar mensagens para os motores de cálculo (BreadMath) ou nutrição (NutriEngine).
- [x] Validar o recebimento e resposta de uma "Pergunta de Hidratação" simulada.

---

## Tasks
- [x] **Infrastructure:** Criar pasta `packages/chefia-core/src/adapters`.
- [x] **Logic:** Implementar interface `IMessengerProvider`.
- [x] **Integration:** Implementar `TelegramProvider.ts`.
- [x] **Integration:** Implementar `WhatsAppProvider.ts`.
- [x] **Routing:** Implementar `ChefRouter.ts` para conectar a "Voz" ao "Cérebro".

---

## Dev Agent Record
### Agent Model Used
Gemini 2.0 Flash

### Change Log
- 2026-02-26: Story created by @dev (Dex)
- 2026-02-26: Story completed by @orion (Gemini CLI) - Implemented Telegram/WhatsApp mocks and dynamic ChefRouter.

### File List
- `packages/chefia-core/src/adapters/IMessengerProvider.ts`
- `packages/chefia-core/src/adapters/TelegramProvider.ts`
- `packages/chefia-core/src/adapters/WhatsAppProvider.ts`
- `packages/chefia-core/src/logic/ChefRouter.ts`
- `packages/chefia-core/tests/Router.test.ts`
