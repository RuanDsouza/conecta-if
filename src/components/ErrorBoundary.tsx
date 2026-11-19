import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { extractFriendlyErrorMessage } from '../services/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: extractFriendlyErrorMessage(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('Erro capturado pelo ErrorBoundary:', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, message: '' });
    window.location.assign('/');
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-[#E5EAE6]">
                Algo inesperado aconteceu
              </h1>
            </div>
            <p className="text-sm text-[#B8C0BA] leading-relaxed">
              {this.state.message ||
                'Não foi possível concluir a operação solicitada. Tente recarregar a página.'}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
