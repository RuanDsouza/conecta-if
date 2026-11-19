import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-4">
        <FileQuestion className="w-10 h-10 text-[#52C878] mx-auto" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
          Página não encontrada
        </h1>
        <p className="text-sm text-[#B8C0BA] leading-relaxed">
          O endereço acessado não existe ou foi movido. Utilize o botão abaixo para retornar à navegação principal.
        </p>
        <div className="pt-2 flex justify-center">
          <Link
            to={user ? '/feed' : '/'}
            className="px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors"
          >
            {user ? 'Voltar ao feed' : 'Voltar ao início'}
          </Link>
        </div>
      </div>
    </div>
  );
};
