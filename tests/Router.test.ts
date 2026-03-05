import { ChefRouter } from '../src/logic/ChefRouter';
import { LeadManager } from '../src/logic/LeadManager';
import { SessionManager } from '../src/logic/SessionManager';
import { AIEngine } from '../src/logic/AIEngine';

jest.mock('../src/logic/LeadManager', () => ({
    LeadManager: {
        getUserState: jest.fn().mockResolvedValue({ step: 'REGISTERED' }),
        setUserState: jest.fn(),
        addLead: jest.fn()
    }
}));
jest.mock('../src/logic/SessionManager', () => ({
    SessionManager: {
        getHistory: jest.fn().mockResolvedValue([]),
        addMessage: jest.fn(),
        clearSession: jest.fn()
    }
}));
jest.mock('../src/logic/AIEngine', () => ({
    AIEngine: {
        generateResponse: jest.fn().mockResolvedValue('Resposta mock do ChefIA!')
    }
}));

const mockMsg = (text: string) => ({
    userId: 'router_test_user', userName: 'RouterTester', text, platform: 'Telegram' as const
});

describe('ChefRouter (compatibilidade)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('deve estar definido como modulo estatico', () => {
        expect(ChefRouter.handleMessage).toBeDefined();
    });

    test('deve processar mensagem de usuario registrado via IA', async () => {
        const res = await ChefRouter.handleMessage(mockMsg('O que e sourdough?'));
        expect(res).toBe('Resposta mock do ChefIA!');
        expect(AIEngine.generateResponse).toHaveBeenCalled();
    });
});
