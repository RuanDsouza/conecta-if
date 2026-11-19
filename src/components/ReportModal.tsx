import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { CONTENT_LIMITS, REPORT_REASONS } from '../config/appConfig';
import { submitReport } from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { ReportReason, ReportTargetType } from '../types/domain';

interface ReportModalProps {
  open: boolean;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetExcerpt: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  open,
  reporterId,
  targetType,
  targetId,
  targetExcerpt,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ReportReason>('off_topic');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const targetLabel =
    targetType === 'question'
      ? 'pergunta'
      : targetType === 'answer'
        ? 'resposta'
        : targetType === 'complement'
          ? 'complementação'
          : 'perfil';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitReport({
        reporterId,
        targetType,
        targetId,
        targetExcerpt,
        reason,
        description,
      });
      setSent(true);
      onSuccess?.();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    setDescription('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
            <h2 id="report-modal-title" className="text-lg font-semibold text-[#E5EAE6]">
              Denunciar {targetLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar formulário de denúncia"
            className="text-[#B8C0BA] hover:text-[#E5EAE6] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#101311] border border-[#27864A]/60 text-sm text-[#E5EAE6]">
              Denúncia registrada com segurança. A equipe de moderação analisará o conteúdo conforme as diretrizes acadêmicas do IF Baiano.
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-[#101311] border border-[#343B36] text-xs text-[#B8C0BA] line-clamp-2">
              Referência: {targetExcerpt}
            </div>

            <div className="space-y-2">
              <label htmlFor="report-reason" className="block text-sm font-medium text-[#E5EAE6]">
                Motivo da denúncia
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                {REPORT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="report-description" className="block text-sm font-medium text-[#E5EAE6]">
                  Detalhes adicionais (opcional)
                </label>
                <span className="text-xs text-[#B8C0BA] tabular-nums">
                  {description.length}/{CONTENT_LIMITS.reportDescMax}
                </span>
              </div>
              <textarea
                id="report-description"
                rows={3}
                maxLength={CONTENT_LIMITS.reportDescMax}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva brevemente o problema observado para ajudar na análise..."
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#343B36] text-sm font-medium text-[#E5EAE6] hover:bg-[#222924] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar denúncia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
