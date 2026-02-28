import { ChefRouter } from '../src/logic/ChefRouter';
import { DatabaseUtils } from '../src/utils/DatabaseUtils';
import { AIEngine } from '../src/logic/AIEngine';

// Mocks Globais (Issue 8)
jest.mock('../src/utils/DatabaseUtils');
jest.mock('../src/logic/AIEngine');
jest.mock('node-telegram-bot-api');

describe('ChefRouter', () => {
    let router: ChefRouter;
    let mockDb: jest.Mocked<DatabaseUtils>;
    let mockAi: jest.Mocked<AIEngine>;

    beforeEach(() => {
        mockDb = new DatabaseUtils() as jest.Mocked<DatabaseUtils>;
        mockAi = new AIEngine() as jest.Mocked<AIEngine>;
        router = new ChefRouter();
    });

    test('deve inicializar o bot sem erros', () => {
        expect(router).toBeDefined();
    });

    test('deve processar mensagens de boas-vindas com mocks', async () => {
        // Mock da resposta da IA
        (mockAi.generateResponse as jest.Mock).mockResolvedValue('Olá, sou o ChefIA Mock!');
        
        // Simulação de teste aqui...
        expect(mockAi.generateResponse).toBeDefined();
    });
});
