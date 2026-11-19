import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-4">
        <ShieldX className="w-10 h-10 text-red-400 mx-auto" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">Acesso negado</h1>
        <p className="text-sm text-[#B8C0BA] leading-relaxed">
          Você não possui permissão para acessar esta área ou executar esta ação. Caso considere um engano, procure a coordenação da comunidade.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to={user ? '/feed' : '/'}
            className="px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors"
          >
            {user ? 'Voltar ao feed' : 'Ir para o início'}
          </Link>
        </div>
      </div>
    </div>
  );
};
