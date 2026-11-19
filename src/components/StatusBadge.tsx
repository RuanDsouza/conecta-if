import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { QuestionStatus } from '../types/domain';

interface StatusBadgeProps {
  status: QuestionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'resolved') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52C878] whitespace-nowrap shrink-0"
        aria-label="Status: Resolvida"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Resolvida
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 whitespace-nowrap shrink-0"
      aria-label="Status: Aberta"
    >
      <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      Aberta
    </span>
  );
};
