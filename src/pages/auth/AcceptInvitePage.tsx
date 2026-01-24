import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, UserPlus, AlertCircle, Check, Eye, EyeOff, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/team.service';
import { Invitation, ROLE_NAMES } from '../../types/permissions';

const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [invitation, setInvitation] = useState<(Invitation & { isValid: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form for new users
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Token de convite inválido');
        setIsLoading(false);
        return;
      }

      try {
        const data = await teamService.getInvitationByToken(token);
        setInvitation(data);

        // Se o usuário já está logado e o email não corresponde, mostrar erro
        if (isAuthenticated && user && user.email !== data.email) {
          setError(`Este convite foi enviado para ${data.email}. Por favor, faça logout e acesse novamente.`);
        }
      } catch (err: any) {
        setError(err.message || 'Convite não encontrado ou inválido');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token, isAuthenticated, user]);

  const handleAccept = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await teamService.acceptInvitation(token, { name, password });

      if (result.requiresRegistration) {
        // Precisa criar conta - mostrar formulário
        return;
      }

      // Sucesso - redirecionar para dashboard
      if (isAuthenticated) {
        await refreshUser();
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !confirm('Tem certeza que deseja recusar este convite?')) return;

    try {
      await teamService.declineInvitation(token);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao recusar convite');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 flex items-center justify-center p-4">
        <div className="bg-brand-900/50 border border-brand-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Convite Inválido</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (!invitation || !invitation.isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 flex items-center justify-center p-4">
        <div className="bg-brand-900/50 border border-brand-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Convite Expirado</h1>
          <p className="text-gray-400 mb-6">
            Este convite não é mais válido. Por favor, solicite um novo convite ao administrador da empresa.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  // Se o usuário já está logado com o email correto
  const isLoggedInWithCorrectEmail = isAuthenticated && user?.email === invitation.email;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 flex items-center justify-center p-4">
      <div className="bg-brand-900/50 border border-brand-800 rounded-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Você foi convidado!</h1>
          <p className="text-gray-400">
            Para se juntar à equipe de <strong className="text-white">{invitation.company?.tradeName}</strong>
          </p>
        </div>

        {/* Company Info */}
        <div className="bg-brand-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-700 rounded-lg">
              <Building2 className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-white font-medium">{invitation.company?.tradeName}</p>
              <p className="text-gray-400 text-sm">
                {invitation.company?.type === 'BRAND' ? 'Marca' : 'Facção'}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>
              Role: <span className="text-brand-400">{ROLE_NAMES[invitation.companyRole]}</span>
            </p>
            <p>
              Convidado por: <span className="text-white">{invitation.invitedBy}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {isLoggedInWithCorrectEmail ? (
          // Usuário logado - apenas aceitar
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
              <Check className="w-4 h-4 inline mr-2" />
              Você está logado como <strong>{user?.email}</strong>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 px-4 py-3 border border-brand-700 text-gray-400 rounded-lg hover:bg-brand-800 transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Aceitando...' : 'Aceitar Convite'}
              </button>
            </div>
          </div>
        ) : (
          // Usuário não logado - formulário de registro
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAccept();
            }}
            className="space-y-4"
          >
            <div className="bg-brand-800/50 rounded-lg p-3 text-gray-400 text-sm">
              Crie sua conta para aceitar o convite
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="w-full px-4 py-2 bg-brand-800/30 border border-brand-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                minLength={3}
                className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Crie uma senha"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 pr-10 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Mínimo de 6 caracteres</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDecline}
                className="flex-1 px-4 py-3 border border-brand-700 text-gray-400 rounded-lg hover:bg-brand-800 transition-colors"
              >
                Recusar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Criando conta...' : 'Criar Conta e Aceitar'}
              </button>
            </div>
          </form>
        )}

        {/* Já tem conta? */}
        {!isAuthenticated && (
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-brand-400 hover:text-brand-300"
              >
                Faça login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
