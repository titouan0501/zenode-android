import { useIsFocused, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { fetchAuthConfig, fetchSessions } from './auth';
import { errorMessage, request } from './client';
import {
  logsToText,
  normalizeBotDetail,
  normalizeBotList,
  normalizePublicStatus,
  parseServerResources,
  type BotItem,
} from './models';
import { POLL_DETAIL_MS, STALE_LIST_MS, STALE_USER_MS } from './queryClient';
import type { AccountFull, HostServer, Me } from './types';
import { KNOWN_PROVIDERS } from './types';
import { useToast } from '@/components/Toast';
import { effectiveServerStatus, isOnlineStatus } from '@/lib/status';

export const keys = {
  authConfig: ['auth-config'] as const,
  me: ['user'] as const,
  account: ['account'] as const,
  bots: ['bots'] as const,
  bot: (id: string) => ['bot', id] as const,
  botLogs: (id: string) => ['bot-logs', id] as const,
  servers: ['servers'] as const,
  server: (id: string) => ['server', id] as const,
  serverResources: (id: string) => ['server-resources', id] as const,
  sessions: ['sessions'] as const,
  publicStatus: ['public-status'] as const,
};

/**
 * Refetch quand l'ecran reprend le focus (pas au premier affichage),
 * seulement si les donnees sont perimees.
 */
export function useRefetchOnFocus(
  queryKey: readonly unknown[],
  refetch: () => unknown,
  staleMs: number = STALE_LIST_MS,
) {
  const queryClient = useQueryClient();
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      const q = queryClient.getQueryCache().find({ queryKey: queryKey as unknown[], exact: true });
      if (!q || q.isStaleByTime(staleMs)) refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient, refetch, staleMs]),
  );
}

// ------------------------------------------------------------------ auth

export function useAuthConfig() {
  return useQuery({
    queryKey: keys.authConfig,
    queryFn: async () => {
      const cfg = await fetchAuthConfig();
      const providers = (Array.isArray(cfg.providers) ? cfg.providers : []).filter((p) =>
        (KNOWN_PROVIDERS as string[]).includes(p),
      );
      return { ...cfg, providers: providers as (typeof KNOWN_PROVIDERS)[number][] };
    },
    staleTime: 5 * 60_000,
  });
}

export function useSessions() {
  return useQuery({ queryKey: keys.sessions, queryFn: fetchSessions, staleTime: STALE_LIST_MS });
}

// ------------------------------------------------------------------ moi

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => request<Me>('/api/user'),
    staleTime: STALE_USER_MS,
  });
}

export function useAccountFull(enabled = true) {
  return useQuery({
    queryKey: keys.account,
    queryFn: () => request<AccountFull>('/api/account/full'),
    staleTime: STALE_USER_MS,
    enabled,
  });
}

// ------------------------------------------------------------------ bots

export function useBots() {
  return useQuery({
    queryKey: keys.bots,
    queryFn: async () => normalizeBotList(await request('/api/bots')),
    staleTime: STALE_LIST_MS,
  });
}

export function useBot(botId: string) {
  const queryClient = useQueryClient();
  const focused = useIsFocused();
  return useQuery({
    queryKey: keys.bot(botId),
    queryFn: async () => {
      const bot = normalizeBotDetail(await request(`/api/bots/${encodeURIComponent(botId)}`));
      if (!bot) throw new Error('Bot introuvable');
      return bot;
    },
    // Affichage immediat depuis la liste, puis la fiche complete arrive.
    placeholderData: () =>
      queryClient.getQueryData<BotItem[]>(keys.bots)?.find((b) => b.id === botId),
    refetchInterval: focused ? POLL_DETAIL_MS : false,
    enabled: Boolean(botId),
  });
}

export function useBotLogs(botId: string) {
  return useQuery({
    queryKey: keys.botLogs(botId),
    queryFn: async () =>
      logsToText(await request(`/api/bots/${encodeURIComponent(botId)}/logs?lines=80`)),
    staleTime: Infinity, // rafraichissement manuel seulement
    gcTime: 0,
    enabled: Boolean(botId),
  });
}

export type BotAction = 'start' | 'stop' | 'restart';

const BOT_TOAST: Record<BotAction, string> = {
  start: 'Bot démarré',
  stop: 'Bot arrêté',
  restart: 'Bot redémarré',
};

export function useBotAction(botId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ action, vmHost }: { action: BotAction; vmHost: string | null }) =>
      request(`/api/bots/${encodeURIComponent(botId)}/${action}`, {
        method: 'POST',
        // stop : {} ; start/restart : vm_host seulement s'il est connu.
        body: action !== 'stop' && vmHost ? { vm_host: vmHost } : {},
      }),
    onSuccess: async (_data, { action }) => {
      toast.show(BOT_TOAST[action]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.bot(botId) }),
        queryClient.invalidateQueries({ queryKey: keys.bots }),
      ]);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

// --------------------------------------------------------------- serveurs

export function useServers() {
  return useQuery({
    queryKey: keys.servers,
    queryFn: async () => {
      const res = await request<{ servers?: HostServer[] }>('/api/hosting/servers');
      const list = Array.isArray(res?.servers) ? res.servers : [];
      return list.filter((s) => s && (s.status ?? '') !== 'deleted' && s.runtime_status !== 'deleted');
    },
    staleTime: STALE_LIST_MS,
  });
}

export function useServer(serverId: string) {
  const queryClient = useQueryClient();
  const focused = useIsFocused();
  return useQuery({
    queryKey: keys.server(serverId),
    queryFn: async () => {
      const res = await request<{ server?: HostServer }>(
        `/api/hosting/servers/${encodeURIComponent(serverId)}`,
      );
      if (!res?.server) throw new Error('Serveur introuvable');
      return res.server;
    },
    placeholderData: () =>
      queryClient
        .getQueryData<HostServer[]>(keys.servers)
        ?.find((s) => String(s.server_id ?? s.id) === serverId),
    refetchInterval: focused ? POLL_DETAIL_MS : false,
    enabled: Boolean(serverId),
  });
}

/** RAM / disque / CPU : si l'appel echoue, les barres sont masquees (pas d'erreur). */
export function useServerResources(server: HostServer | undefined, serverId: string) {
  const focused = useIsFocused();
  // Inutile de demander des mesures a un serveur qui ne tourne pas.
  const isOnline = server ? isOnlineStatus(effectiveServerStatus(server)) : false;
  return useQuery({
    queryKey: keys.serverResources(serverId),
    queryFn: async () =>
      parseServerResources(
        await request(`/api/hosting/servers/${encodeURIComponent(serverId)}/resources`),
        server ?? {},
      ),
    enabled: Boolean(serverId) && Boolean(server) && isOnline,
    retry: false,
    refetchInterval: focused ? POLL_DETAIL_MS : false,
  });
}

export type PowerSignal = 'start' | 'stop' | 'restart';

export function useServerPower(serverId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (signal: PowerSignal) =>
      request<{ ok?: boolean; message?: string }>(
        `/api/hosting/servers/${encodeURIComponent(serverId)}/power`,
        { method: 'POST', body: { signal } },
      ),
    onSuccess: async (res) => {
      toast.show(res?.message || 'Commande envoyée.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.server(serverId) }),
        queryClient.invalidateQueries({ queryKey: keys.servers }),
        queryClient.invalidateQueries({ queryKey: keys.serverResources(serverId) }),
      ]);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

// ---------------------------------------------------------------- public

/** Public : pas de Bearer. 404 => pas de liste (retry desactive). */
export function usePublicStatus() {
  return useQuery({
    queryKey: keys.publicStatus,
    queryFn: async () => normalizePublicStatus(await request('/api/public/status', { auth: false })),
    retry: false,
    staleTime: 60_000,
  });
}
