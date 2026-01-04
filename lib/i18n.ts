export const translateError = (message: string): string => {
    if (!message) return 'Ocorreu um erro inesperado.';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
        return 'E-mail ou senha incorretos.';
    }
    if (lowerMessage.includes('user already registered')) {
        return 'Este e-mail já está cadastrado no sistema.';
    }
    if (lowerMessage.includes('email not confirmed')) {
        return 'E-mail não confirmado. Por favor, verifique sua caixa de entrada para ativar sua conta.';
    }
    if (lowerMessage.includes('signup is disabled')) {
        return 'O cadastro de novos usuários está temporariamente desativado.';
    }
    if (lowerMessage.includes('invalid refresh token')) {
        return 'Sessão expirada. Por favor, faça login novamente.';
    }
    if (lowerMessage.includes('user not found')) {
        return 'Usuário não encontrado. Verifique os dados informados.';
    }
    if (lowerMessage.includes('password should be at least 6 characters')) {
        return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (lowerMessage.includes('too many requests')) {
        return 'Muitas tentativas. Por favor, aguarde um pouco antes de tentar novamente.';
    }
    if (lowerMessage.includes('flow state not found')) {
        return 'Sessão de login expirada ou inválida. Tente novamente.';
    }

    // Fallback for common phrases
    if (lowerMessage.includes('network error') || lowerMessage.includes('failed to fetch')) {
        return 'Erro de conexão. Verifique sua internet.';
    }

    return message; // Return original if no translation found or it's already in PT
};
