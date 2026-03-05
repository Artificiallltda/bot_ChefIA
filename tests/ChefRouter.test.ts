/**
 * ChefRouter.test.ts
 * Testes do fluxo de cadastro e comandos do ChefRouter.
 * Usa mocks para LeadManager, SessionManager e AIEngine — sem banco real.
 */

jest.mock('../src/logic/LeadManager', () => ({
    LeadManager: {
        getUserState: jest.fn(),
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
        generateResponse: jest.fn().mockResolvedValue('Resposta simulada da IA.')
    }
}));

import { ChefRouter } from '../src/logic/ChefRouter';
import { LeadManager } from '../src/logic/LeadManager';
import { SessionManager } from '../src/logic/SessionManager';

const mockLeadManager = LeadManager as jest.Mocked<typeof LeadManager>;
const mockSession = SessionManager as jest.Mocked<typeof SessionManager>;

const mockMsg = (text: string) => ({
    userId: 'user_123',
    userName: 'TestUser',
    text,
    platform: 'Telegram' as const
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ── Comandos ───────────────────────────────────────────────────────────────

describe('Comandos do bot', () => {
    it('/start deve resetar estado e retornar boas-vindas', async () => {
        const res = await ChefRouter.handleMessage(mockMsg('/start'));
        expect(mockLeadManager.setUserState).toHaveBeenCalledWith('user_123', { step: 'START' });
        expect(mockSession.clearSession).toHaveBeenCalledWith('user_123');
        expect(res).toContain('ChefIA');
    });

    it('/help deve retornar lista de comandos', async () => {
        const res = await ChefRouter.handleMessage(mockMsg('/help'));
        expect(res).toContain('/start');
        expect(res).toContain('/menu');
    });

    it('/menu deve retornar opções de mentoria', async () => {
        const res = await ChefRouter.handleMessage(mockMsg('/menu'));
        expect(res).toContain('Panificação');
        expect(res).toContain('Nutrição');
        expect(res).toContain('Zero Waste');
    });

    it('/reset_sessao deve limpar sessão e confirmar', async () => {
        const res = await ChefRouter.handleMessage(mockMsg('/reset_sessao'));
        expect(mockSession.clearSession).toHaveBeenCalledWith('user_123');
        expect(res).toContain('Sessão Limpa');
    });
});

// ── Fluxo de Cadastro ──────────────────────────────────────────────────────

describe('Fluxo de cadastro', () => {
    it('estado START deve solicitar e-mail', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'START' });
        const res = await ChefRouter.handleMessage(mockMsg('oi'));
        expect(mockLeadManager.setUserState).toHaveBeenCalledWith('user_123', { step: 'AWAITING_EMAIL' });
        expect(res).toContain('e-mail');
    });

    it('e-mail inválido deve retornar mensagem de erro', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'AWAITING_EMAIL' });
        const res = await ChefRouter.handleMessage(mockMsg('emailerrado'));
        expect(res).toContain('incorreto');
        expect(mockLeadManager.setUserState).not.toHaveBeenCalled();
    });

    it('e-mail válido deve avançar para AWAITING_PHONE', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'AWAITING_EMAIL' });
        const res = await ChefRouter.handleMessage(mockMsg('teste@email.com'));
        expect(mockLeadManager.addLead).toHaveBeenCalled();
        expect(mockLeadManager.setUserState).toHaveBeenCalledWith('user_123', { step: 'AWAITING_PHONE' });
        expect(res).toContain('celular');
    });

    it('telefone muito curto deve retornar mensagem de erro', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'AWAITING_PHONE' });
        const res = await ChefRouter.handleMessage(mockMsg('123'));
        expect(res).toContain('DDD');
        expect(mockLeadManager.setUserState).not.toHaveBeenCalled();
    });

    it('telefone válido deve completar cadastro', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'AWAITING_PHONE' });
        const res = await ChefRouter.handleMessage(mockMsg('41999991111'));
        expect(mockLeadManager.setUserState).toHaveBeenCalledWith('user_123', { step: 'REGISTERED' });
        expect(res).toContain('Cadastro concluído');
    });
});

// ── IA (usuário registrado) ────────────────────────────────────────────────

describe('Usuário já registrado', () => {
    it('deve chamar AIEngine e retornar resposta', async () => {
        mockLeadManager.getUserState.mockResolvedValue({ step: 'REGISTERED' });
        const res = await ChefRouter.handleMessage(mockMsg('Como fazer pão sourdough?'));
        expect(res).toBe('Resposta simulada da IA.');
    });
});
