import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { APP_CONFIG, DEFAULT_SUBJECTS, IF_BAIANO_CAMPUSES } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [heroImgError, setHeroImgError] = useState(false);
  const [deskImgError, setDeskImgError] = useState(false);

  const isAuthenticatedReady = Boolean(user && user.emailVerified && profile);

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex flex-col">
      {/* Barra superior: 3 zonas claras */}
      <header className="border-b border-[#343B36] bg-[#101311]/95 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[#E5EAE6] whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight">
              {APP_CONFIG.brandName}
            </span>
          </Link>

          <nav
            aria-label="Navegação da página inicial"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#B8C0BA]"
          >
            <a href="#proposta" className="hover:text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0">
              Proposta
            </a>
            <a href="#como-funciona" className="hover:text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0">
              Como funciona
            </a>
            <a href="#disciplinas" className="hover:text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0">
              Disciplinas
            </a>
            <a href="#campi" className="hover:text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0">
              Campi
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticatedReady ? (
              <Link
                to="/feed"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0"
              >
                Ir para o Feed
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Seção Hero */}
        <section id="proposta" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-medium text-[#52C878]">
                Comunidade estudantil · {APP_CONFIG.institutionFull}
              </p>

              <h1
                className="font-display font-bold text-[#E5EAE6] tracking-tight leading-[1.12] [text-wrap:balance]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              >
                Dúvidas reais, respostas construídas entre colegas do IF Baiano.
              </h1>

              <p className="text-base sm:text-lg text-[#B8C0BA] leading-relaxed max-w-xl">
                Publique questões das suas disciplinas, organize raciocínios passo a passo com outros estudantes e mantenha um acervo colaborativo confiável entre os campi.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={isAuthenticatedReady ? '/feed' : '/cadastro'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors whitespace-nowrap"
                >
                  {isAuthenticatedReady ? 'Acessar comunidade' : 'Criar conta de estudante'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                {!isAuthenticatedReady && (
                  <Link
                    to="/login"
                    className="inline-flex items-center px-5 py-3 rounded-lg border border-[#343B36] hover:border-[#52C878]/60 text-sm font-medium text-[#E5EAE6] transition-colors whitespace-nowrap"
                  >
                    Já tenho cadastro
                  </Link>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-[#343B36] bg-[#1B211D]">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_library_study_1795091733768.jpg"
                    alt="Estudantes colaborando com notebooks e cadernos em mesa de biblioteca"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover aspect-video lg:aspect-auto"
                  />
                ) : (
                  <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#1B211D]">
                    <BookOpen className="w-10 h-10 text-[#52C878]" aria-hidden="true" />
                    <p className="text-sm text-[#B8C0BA]">
                      Estudo colaborativo entre estudantes dos cursos técnicos e superiores.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Seção Como Funciona */}
        <section id="como-funciona" className="border-t border-[#343B36] bg-[#1B211D]/45">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-[#343B36] bg-[#1B211D]">
                {!deskImgError ? (
                  <img
                    src="/src/assets/images/academic_study_desk_1795091713410.jpg"
                    alt="Mesa de estudos com notebook exibindo código e caderno com equações de cálculo e circuitos"
                    referrerPolicy="no-referrer"
                    onError={() => setDeskImgError(true)}
                    className="w-full h-auto object-cover aspect-[4/3]"
                  />
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center p-8">
                    <MessageSquareText className="w-10 h-10 text-[#52C878]" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#E5EAE6] [text-wrap:balance]">
                  Colaboração estruturada, sem ruído ou competição por pontos
                </h2>
                <p className="text-sm sm:text-base text-[#B8C0BA] leading-relaxed">
                  Cada dúvida segue um fluxo claro para preservar a autoria das explicações e facilitar a revisão antes de provas e trabalhos.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-[#343B36]">
                <div className="pt-2 space-y-1.5">
                  <h3 className="text-base font-semibold text-[#E5EAE6]">
                    01. Publique com contexto acadêmico
                  </h3>
                  <p className="text-sm text-[#B8C0BA] leading-relaxed">
                    Informe disciplina, curso, campus, trechos de código ou link de referência para que colegas entendam exatamente onde surgiu a dificuldade.
                  </p>
                </div>

                <div className="pt-5 space-y-1.5">
                  <h3 className="text-base font-semibold text-[#E5EAE6]">
                    02. Responda e complemente sem sobrescrever ninguém
                  </h3>
                  <p className="text-sm text-[#B8C0BA] leading-relaxed">
                    Respostas principais recebem complementações vinculadas do autor da dúvida ou do autor da resposta, mantendo histórico organizado e autoria preservada.
                  </p>
                </div>

                <div className="pt-5 space-y-1.5">
                  <h3 className="text-base font-semibold text-[#E5EAE6]">
                    03. Controle de status e validação real
                  </h3>
                  <p className="text-sm text-[#B8C0BA] leading-relaxed">
                    Apenas quem abriu a dúvida pode marcá-la como resolvida — e reabri-la caso surjam novas questões. Tudo protegido por autenticação e regras no servidor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Disciplinas e Campi */}
        <section id="disciplinas" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-display text-2xl font-bold text-[#E5EAE6]">
                Disciplinas do ensino integrado, técnico e superior
              </h2>
              <p className="text-sm text-[#B8C0BA] leading-relaxed">
                Filtre o feed por matéria, curso, campus, período e status para localizar rapidamente dúvidas em aberto ou explicações já resolvidas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {DEFAULT_SUBJECTS.map((subj) => (
                  <div
                    key={subj.id}
                    className="bg-[#1B211D] border border-[#343B36] rounded-lg px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-[#E5EAE6]">{subj.name}</span>
                    <span className="text-xs text-[#B8C0BA]">{subj.area}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="campi" className="lg:col-span-5 bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2.5 text-[#52C878]">
                <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
                <h3 className="text-base font-semibold text-[#E5EAE6]">
                  Integração entre todos os campi
                </h3>
              </div>
              <p className="text-sm text-[#B8C0BA] leading-relaxed">
                Estudantes de qualquer unidade do IF Baiano podem interagir no mesmo ambiente ou filtrar dúvidas do seu próprio campus.
              </p>
              <ul className="space-y-2 text-xs text-[#B8C0BA] pt-1 columns-1 sm:columns-2 gap-4">
                {IF_BAIANO_CAMPUSES.slice(0, 14).map((campus) => (
                  <li key={campus} className="flex items-center gap-2 break-inside-avoid mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#52C878] shrink-0" aria-hidden="true" />
                    <span>{campus.replace('Campus ', '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#343B36] bg-[#101311]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#B8C0BA]">
          <p>
            {APP_CONFIG.brandName} · Plataforma acadêmica colaborativa para estudantes do {APP_CONFIG.institutionShort}.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/cadastro" className="hover:text-[#E5EAE6] transition-colors">
              Cadastro
            </Link>
            <Link to="/login" className="hover:text-[#E5EAE6] transition-colors">
              Entrar
            </Link>
            <Link to="/recuperar-senha" className="hover:text-[#E5EAE6] transition-colors">
              Recuperar senha
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
