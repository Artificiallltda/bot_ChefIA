# Arquitetura Técnica - ChefIA: Gastronomic Intelligence System

## 1. Visão Geral (The Gastronomic Engine)
O ChefIA é construído sobre uma arquitetura de serviços desacoplados, permitindo que a inteligência técnica (cálculos e nutrição) seja consumida por diferentes interfaces (WhatsApp, Telegram e Web SaaS).

## 2. Camadas do Sistema

### A. Intelligence Layer (O Cérebro)
- **Calculation Service (Bread Math):** Motor Node.js/TypeScript para cálculos de Baker's Percentage, hidratação e escalas de produção.
- **Nutrition Logic:** Integração com bases de dados nutricionais para análise de receitas em tempo real.
- **Knowledge Graph:** Estrutura de grafos para relacionar técnicas (ex: Autólise) com ingredientes (ex: Farinha de Glúten Forte) e benefícios de saúde.

### B. Persistence Layer (A Memória)
- **User Context Store:** Banco de dados (PostgreSQL/Supabase) para armazenar:
  - Perfil do fermento do usuário (nome, idade, ciclo de alimentação).
  - Preferências alimentares e restrições.
  - Histórico de fornadas e fotos (evolução técnica).
- **Recipe Registry:** Repositório de receitas técnicas com metadados de performance.

### C. Integration Layer (As Vozes)
- **Messenger Adapter:** Interface para Twilio/WhatsApp e Telegram Bot API.
- **SaaS API:** Endpoints REST/tRPC para a futura plataforma Web ChefIA.

## 3. Fluxo de Dados Crítico: O Ciclo da Fermentação
1. **Input:** Usuário envia: "Meu Levain dobrou em 4h a 25°C, como faço minha pizza hoje?"
2. **Analysis:** O sistema consulta o histórico do fermento e a temperatura local.
3. **Calculation:** O Math Engine calcula a hidratação recomendada (ex: 65% para iniciante com farinha nacional).
4. **Mentorship:** O agente gera a resposta técnica e acolhedora, explicando o processo de maturação a frio necessário.

## 4. Stack Tecnológica Recomendada
- **Linguagem:** TypeScript (Segurança de tipos para cálculos matemáticos).
- **Backend:** Node.js (Express ou Fastify).
- **Database:** Supabase (PostgreSQL + Auth + Storage para fotos de pães).
- **AI/LLM:** GPT-4o ou Claude 3.5 Sonnet com RAG (Retrieval-Augmented Generation) para a base técnica de panificação.
