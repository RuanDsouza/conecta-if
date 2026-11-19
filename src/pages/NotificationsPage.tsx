import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { NotificationItem } from '../types/domain';
import { formatRelativeDate } from '../utils/validation';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserNotifications(user.uid);
      setNotifications(list);
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (notif: NotificationItem) => {
    if (notif.isRead) return;
    try {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead(notifications);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationDescription = (n: NotificationItem): string => {
    switch (n.type) {
      case 'new_answer':
        return `${n.actorName} respondeu à sua dúvida: "${n.relatedQuestionTitle}"`;
      case 'new_complement':
        return `${n.actorName} adicionou uma complementação na dúvida: "${n.relatedQuestionTitle}"`;
      case 'helpful_answer':
        return `${n.actorName} marcou sua resposta como útil em: "${n.relatedQuestionTitle}"`;
    }
  };

  const visibleItems =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppLayout pageTitle="Notificações">
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Notificações
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Acompanhe respostas, complementações e agradecimentos recebidos.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={markingAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#343B36] hover:border-[#52C878] text-xs font-medium text-[#E5EAE6] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCheck className="w-4 h-4 text-[#52C878]" aria-hidden="true" />
              {markingAll ? 'Atualizando...' : 'Marcar todas como lidas'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1B211D] border border-[#343B36] w-fit">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer tabular-nums ${
              filter === 'all' ? 'bg-[#27864A] text-[#E5EAE6]' : 'text-[#B8C0BA]'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer tabular-nums ${
              filter === 'unread' ? 'bg-[#27864A] text-[#E5EAE6]' : 'text-[#B8C0BA]'
            }`}
          >
            Não lidas ({unreadCount})
          </button>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-sm text-[#B8C0BA]">
            Carregando notificações...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-2">
            <Bell className="w-7 h-7 text-[#B8C0BA] mx-auto" aria-hidden="true" />
            <p className="text-sm text-[#B8C0BA]">
              {filter === 'unread'
                ? 'Você não possui notificações não lidas.'
                : 'Nenhuma notificação recebida até o momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((n) => (
              <div
                key={n.id}
                className={`bg-[#1B211D] border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  n.isRead ? 'border-[#343B36]' : 'border-[#27864A]'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    {!n.isRead && (
                      <span className="font-semibold text-[#52C878]">Nova</span>
                    )}
                    <span className="text-[#B8C0BA]">
                      {formatRelativeDate(n.createdAt)}
                    </span>
                  </div>
                  <Link
                    to={`/pergunta/${n.relatedQuestionId}`}
                    onClick={() => handleMarkRead(n)}
                    className="block text-sm font-medium text-[#E5EAE6] hover:text-[#52C878] transition-colors"
                  >
                    {getNotificationDescription(n)}
                  </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#343B36] hover:border-[#52C878] text-xs text-[#E5EAE6] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                      Marcar como lida
                    </button>
                  )}
                  <Link
                    to={`/pergunta/${n.relatedQuestionId}`}
                    onClick={() => handleMarkRead(n)}
                    className="px-3 py-1.5 rounded-lg bg-[#101311] border border-[#343B36] hover:border-[#52C878] text-xs font-medium text-[#E5EAE6]"
                  >
                    Abrir dúvida
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
