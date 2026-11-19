/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import { AuthProvider } from './context/AuthContext';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { CreateQuestionPage } from './pages/CreateQuestionPage';
import { FeedPage } from './pages/FeedPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModerationPage } from './pages/ModerationPage';
import { MyActivityPage } from './pages/MyActivityPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OnboardingProfilePage } from './pages/OnboardingProfilePage';
import { ProfilePage } from './pages/ProfilePage';
import { QuestionDetailPage } from './pages/QuestionDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/cadastro"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
            <Route path="/verificar-email" element={<VerifyEmailPage />} />
            <Route path="/completar-perfil" element={<OnboardingProfilePage />} />

            {/* Rotas privadas autenticadas */}
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nova-pergunta"
              element={
                <ProtectedRoute>
                  <CreateQuestionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editar-pergunta/:id"
              element={
                <ProtectedRoute>
                  <CreateQuestionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pergunta/:id"
              element={
                <ProtectedRoute>
                  <QuestionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil/:id"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/minhas-atividades"
              element={
                <ProtectedRoute>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Rota administrativa */}
            <Route
              path="/moderacao"
              element={
                <AdminRoute>
                  <ModerationPage />
                </AdminRoute>
              }
            />

            {/* Acesso negado e 404 */}
            <Route path="/acesso-negado" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
