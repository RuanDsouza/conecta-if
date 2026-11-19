import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Eye, EyeOff, Info } from 'lucide-react';
import {
  APP_CONFIG,
  IF_BAIANO_CAMPUSES,
  IF_BAIANO_COURSES,
  IF_BAIANO_YEARS,
} from '../config/appConfig';
import { loginWithGoogle, registerWithEmail } from '../services/authService';
import { translateAuthError } from '../services/firebase';
import {
  isInstitutionalEmail,
  validateDisplayName,
  validateEmailFormat,
  validatePassword,
} from '../utils/validation';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [campus, setCampus] = useState(IF_BAIANO_CAMPUSES[0]);
  const [course, setCourse] = useState(IF_BAIANO_COURSES[0]);
  const [year, setYear] = useState(IF_BAIANO_YEARS[0]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsDetails, setShowTermsDetails] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = email.includes('@') && email.includes('.');
  const isInstEmail = emailLooksValid && isInstitutionalEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || googleSubmitting) return;
    setError(null);

    const nameErr = validateDisplayName(displayName);
    if (nameErr) return setError(nameErr);

    const emailErr = validateEmailFormat(email);
    if (emailErr) return setError(emailErr);

    const passErr = validatePassword(password);
    if (passErr) return setError(passErr);

    if (password !== confirmPassword) {
      return setError('A confirmação de senha não coincide com a senha informada.');
    }

    if (!campus || !course) {
      return setError('Selecione seu campus e curso.');
    }

    if (!acceptedTerms) {
      return setError('É necessário aceitar os Termos de Uso e a Política de Privacidade.');
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        displayName,
        email,
        password,
        campus,
        course,
        year,
        acceptedTerms,
      });
      navigate('/verificar-email', { replace: true });
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (submitting || googleSubmitting) return;
    setError(null);
    setGoogleSubmitting(true);
    try {
      const { needsOnboarding } = await loginWithGoogle();
      if (needsOnboarding) {
        navigate('/completar-perfil', { replace: true });
      } else {
        navigate('/feed', { replace: true });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao início
          </Link>
          <Link to="/" className="flex items-center gap-2 text-[#E5EAE6]">
            <BookOpen className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
            <span className="font-display font-bold">{APP_CONFIG.brandName}</span>
          </Link>
        </div>

        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Criar conta acadêmica
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Cadastre-se para publicar dúvidas, responder colegas e acompanhar notificações.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting || googleSubmitting}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#343B36] bg-[#101311] hover:border-[#52C878]/60 text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{googleSubmitting ? 'Conectando ao Google...' : 'Continuar com conta Google'}</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[#343B36]" />
            <span className="shrink mx-3 text-xs text-[#B8C0BA]">ou preencha seus dados</span>
            <div className="flex-grow border-t border-[#343B36]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#E5EAE6]">
                Nome de exibição
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Mariana Silva"
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-sm font-medium text-[#E5EAE6]">
                E-mail institucional (preferencial)
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@estudante.ifbaiano.edu.br"
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
              {emailLooksValid && (
                <div className="flex items-center gap-1.5 text-xs pt-0.5">
                  {isInstEmail ? (
                    <span className="inline-flex items-center gap-1.5 text-[#52C878]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Domínio institucional do IF Baiano identificado.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#B8C0BA]">
                      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Domínio externo. Caso seu campus utilize outro domínio oficial, você ainda poderá verificar sua conta por e-mail.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="block text-sm font-medium text-[#E5EAE6]">
                  Senha (mín. 8 caracteres)
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-[#101311] border border-[#343B36] pl-3.5 pr-10 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B8C0BA] hover:text-[#E5EAE6] p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-[#E5EAE6]">
                  Confirmar senha
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-campus" className="block text-sm font-medium text-[#E5EAE6]">
                  Campus
                </label>
                <select
                  id="reg-campus"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  {IF_BAIANO_CAMPUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-year" className="block text-sm font-medium text-[#E5EAE6]">
                  Ano ou semestre
                </label>
                <select
                  id="reg-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  {IF_BAIANO_YEARS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-course" className="block text-sm font-medium text-[#E5EAE6]">
                Curso
              </label>
              <select
                id="reg-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                {IF_BAIANO_COURSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 text-sm text-[#B8C0BA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 rounded border-[#343B36] bg-[#101311] text-[#27864A] focus:ring-[#52C878]"
                />
                <span>
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsDetails((v) => !v)}
                    className="text-[#52C878] hover:underline font-medium cursor-pointer"
                  >
                    Termos de Uso e Política de Privacidade
                  </button>{' '}
                  do {APP_CONFIG.brandName}.
                </span>
              </label>

              {showTermsDetails && (
                <div className="p-3.5 rounded-lg bg-[#101311] border border-[#343B36] text-xs text-[#B8C0BA] space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-[#E5EAE6]">Resumo dos Termos e Privacidade</p>
                  <p>
                    1. Finalidade estritamente acadêmica e colaborativa para estudantes do IF Baiano.
                  </p>
                  <p>
                    2. Seu e-mail é mantido isolado no sistema de autenticação e não é exibido em páginas públicas.
                  </p>
                  <p>
                    3. É proibido publicar ofensas, spam, exposição de dados pessoais ou respostas com plágio sem explicação.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Criando conta...' : 'Cadastrar e verificar e-mail'}
            </button>
          </form>

          <p className="text-center text-sm text-[#B8C0BA]">
            Já possui cadastro?{' '}
            <Link to="/login" className="text-[#52C878] hover:underline font-medium">
              Entrar na conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
