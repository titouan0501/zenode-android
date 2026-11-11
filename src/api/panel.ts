import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/Toast';
import { API_BASE } from './config';
import { errorMessage, request } from './client';
import { keys } from './queries';
import { STALE_LIST_MS, STALE_USER_MS } from './queryClient';

function invalidateBot(qc: ReturnType<typeof useQueryClient>, botId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.bot(botId) }),
    qc.invalidateQueries({ queryKey: keys.bots }),
  ]);
}

function invalidateServer(qc: ReturnType<typeof useQueryClient>, serverId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.server(serverId) }),
    qc.invalidateQueries({ queryKey: keys.servers }),
  ]);
}

// --------------------------------------------------------------------- bots

export interface PublicModule {
  key: string;
  name: string;
  description: string;
  required: boolean;
  blocked: boolean;
  category: string;
}

export interface AccessManager {
  id: string;
  email: string;
  role: string | null;
  status: string | null;
}

export function usePublicModules() {
  return useQuery({
    queryKey: ['public-modules'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/public/modules', { auth: false });
      const bag = raw?.modules && typeof raw.modules === 'object' ? raw.modules : {};
      return Object.entries(bag).map(([key, value]) => {
        const m = (value ?? {}) as Record<string, unknown>;
        return {
          key,
          name: typeof m.name === 'string' ? m.name : key,
          description: typeof m.description === 'string' ? m.description : '',
          required: m.required === true,
          blocked: m.blocked === true || m.coming_soon === true,
          category: typeof m.category === 'string' ? m.category : '',
        } satisfies PublicModule;
      });
    },
    staleTime: 5 * 60_000,
  });
}

export function useBotManagers(botId: string) {
  return useQuery({
    queryKey: ['bot-managers', botId] as const,
    queryFn: async () => normalizeManagers(await request(`/api/bots/${encodeURIComponent(botId)}/managers`)),
    enabled: Boolean(botId),
  });
}

export function useCreateBot() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: { name: string; token: string; color: string }) =>
      request('/api/bots/create', { method: 'POST', body }),
    onSuccess: async () => {
      toast.show('Bot créé');
      await qc.invalidateQueries({ queryKey: keys.bots });
      await qc.invalidateQueries({ queryKey: keys.me });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useBotToken(botId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (token: string) =>
      request(`/api/bots/${encodeURIComponent(botId)}/token`, { method: 'PUT', body: { token } }),
    onSuccess: async () => {
      toast.show('Jeton mis à jour');
      await invalidateBot(qc, botId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useBotModules(botId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (modules: string[]) =>
      request(`/api/bots/${encodeURIComponent(botId)}/modules`, {
        method: 'PUT',
        body: { modules },
      }),
    onSuccess: async () => {
      toast.show('Modules mis à jour');
      await invalidateBot(qc, botId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useBotManagerMutations(botId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['bot-managers', botId] as const;
  const invite = useMutation({
    mutationFn: (email: string) =>
      request(`/api/bots/${encodeURIComponent(botId)}/managers`, { method: 'POST', body: { email } }),
    onSuccess: async () => {
      toast.show('Invitation envoyée');
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (managerId: string) =>
      request(`/api/bots/${encodeURIComponent(botId)}/managers/${encodeURIComponent(managerId)}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.show('Accès retiré');
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { invite, revoke };
}

export function useConfirmBotActivity(botId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => request(`/api/bots/${encodeURIComponent(botId)}/confirm-activity`, { method: 'POST', body: {} }),
    onSuccess: async () => {
      toast.show('Activité confirmée');
      await invalidateBot(qc, botId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

// ------------------------------------------------------------------ serveurs

export interface FileEntry {
  name: string;
  directory: boolean;
  size: number;
  mime: string;
  modified: string | null;
}

export function useServerFiles(serverId: string, directory: string) {
  return useQuery<{ directory: string; entries: FileEntry[] }>({
    queryKey: ['server-files', serverId, directory] as const,
    queryFn: async () => {
      const q = new URLSearchParams({ directory });
      const raw = await request<any>(
        `/api/hosting/servers/${encodeURIComponent(serverId)}/files?${q.toString()}`,
      );
      const entries = Array.isArray(raw?.entries) ? raw.entries : [];
      return {
        directory: typeof raw?.directory === 'string' ? raw.directory : directory,
        entries: entries.map(
          (e: any): FileEntry => ({
            name: String(e?.name ?? ''),
            directory: e?.directory === true,
            size: typeof e?.size === 'number' ? e.size : 0,
            mime: typeof e?.mime === 'string' ? e.mime : '',
            modified: typeof e?.modified === 'string' ? e.modified : null,
          }),
        ),
      };
    },
    enabled: Boolean(serverId),
  });
}

export async function readServerFile(serverId: string, file: string): Promise<string> {
  const q = new URLSearchParams({ file });
  const raw = await request<any>(
    `/api/hosting/servers/${encodeURIComponent(serverId)}/files/contents?${q.toString()}`,
  );
  const body = raw?.file && typeof raw.file === 'object' ? raw.file : raw;
  return typeof body?.content === 'string' ? body.content : '';
}

export function useFileMutations(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['server-files', serverId] });
  const base = `/api/hosting/servers/${encodeURIComponent(serverId)}/files`;
  const write = useMutation({
    mutationFn: (body: { path: string; content: string }) => request(`${base}/write`, { method: 'POST', body }),
    onSuccess: async () => {
      toast.show('Fichier enregistré');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const mkdir = useMutation({
    mutationFn: (body: { directory: string; name: string }) => request(`${base}/mkdir`, { method: 'POST', body }),
    onSuccess: async () => {
      toast.show('Dossier créé');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const rename = useMutation({
    mutationFn: (body: { from: string; to: string }) => request(`${base}/rename`, { method: 'PUT', body }),
    onSuccess: async () => {
      toast.show('Élément renommé');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (files: string[]) => request(`${base}/delete`, { method: 'POST', body: { files } }),
    onSuccess: async () => {
      toast.show('Élément supprimé');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const decompress = useMutation({
    mutationFn: (file: string) => request(`${base}/decompress`, { method: 'POST', body: { file } }),
    onSuccess: async () => {
      toast.show('Archive extraite');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { write, mkdir, rename, remove, decompress };
}

export interface BackupItem {
  id: string;
  name: string;
  status: string;
  bytes: number | null;
  createdAt: string | null;
  error: string | null;
}

export function useBackups(serverId: string) {
  return useQuery<{ limit: number | null; used: number; backups: BackupItem[] }>({
    queryKey: ['server-backups', serverId] as const,
    queryFn: async () => {
      const raw = await request<any>(`/api/hosting/servers/${encodeURIComponent(serverId)}/backups`);
      const list = Array.isArray(raw?.backups) ? raw.backups : [];
      return {
        limit: typeof raw?.limit === 'number' ? raw.limit : null,
        used: typeof raw?.used === 'number' ? raw.used : list.length,
        backups: list.map(
          (b: any): BackupItem => ({
            id: String(b.backup_id ?? b.id ?? ''),
            name: typeof b.name === 'string' && b.name ? b.name : 'Sauvegarde',
            status: typeof b.status === 'string' ? b.status : '',
            bytes: typeof b.bytes === 'number' ? b.bytes : null,
            createdAt: typeof b.created_at === 'string' ? b.created_at : null,
            error: typeof b.error === 'string' ? b.error : null,
          }),
        ),
      };
    },
    enabled: Boolean(serverId),
  });
}

export function useBackupMutations(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['server-backups', serverId] });
  const base = `/api/hosting/servers/${encodeURIComponent(serverId)}/backups`;
  const create = useMutation({
    mutationFn: () => request(base, { method: 'POST', body: {} }),
    onSuccess: async () => {
      toast.show('Sauvegarde lancée');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const restore = useMutation({
    mutationFn: (backupId: string) =>
      request(`${base}/${encodeURIComponent(backupId)}/restore`, { method: 'POST', body: {} }),
    onSuccess: async () => {
      toast.show('Restauration lancée');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { create, restore };
}

export interface StartupVariable {
  key: string;
  name: string;
  description: string;
  value: string;
  editable: boolean;
}

export interface StartupConfig {
  command: string;
  commandEditable: boolean;
  image: string;
  images: string[];
  variables: StartupVariable[];
}

export function useStartup(serverId: string) {
  return useQuery<StartupConfig>({
    queryKey: ['server-startup', serverId] as const,
    queryFn: async () => {
      const raw = await request<any>(`/api/hosting/servers/${encodeURIComponent(serverId)}/startup`);
      const s = raw?.startup ?? raw ?? {};
      const images = Array.isArray(s.docker_images)
        ? s.docker_images.map((img: any) => (typeof img === 'string' ? img : String(img?.image ?? img?.name ?? ''))).filter(Boolean)
        : [];
      const variables = Array.isArray(s.variables)
        ? s.variables.map(
            (v: any): StartupVariable => ({
              key: String(v.env_variable ?? ''),
              name: typeof v.name === 'string' ? v.name : String(v.env_variable ?? ''),
              description: typeof v.description === 'string' ? v.description : '',
              value: v.value == null ? '' : String(v.value),
              editable: v.user_editable !== false,
            }),
          )
        : [];
      return {
        command: typeof s.startup === 'string' ? s.startup : '',
        commandEditable: s.startup_editable !== false,
        image: typeof s.docker_image === 'string' ? s.docker_image : '',
        images,
        variables,
      } satisfies StartupConfig;
    },
    enabled: Boolean(serverId),
  });
}

export function useSaveStartup(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: { startup?: string; docker_image?: string; environment?: Record<string, string> }) =>
      request(`/api/hosting/servers/${encodeURIComponent(serverId)}/startup`, { method: 'PUT', body }),
    onSuccess: async () => {
      toast.show('Démarrage enregistré');
      await qc.invalidateQueries({ queryKey: ['server-startup', serverId] });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useServerManagers(serverId: string) {
  return useQuery({
    queryKey: ['server-managers', serverId] as const,
    queryFn: async () =>
      normalizeManagers(await request(`/api/hosting/servers/${encodeURIComponent(serverId)}/managers`)),
    enabled: Boolean(serverId),
  });
}

export function useServerManagerMutations(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['server-managers', serverId] as const;
  const invite = useMutation({
    mutationFn: (email: string) =>
      request(`/api/hosting/servers/${encodeURIComponent(serverId)}/managers`, {
        method: 'POST',
        body: { email },
      }),
    onSuccess: async () => {
      toast.show('Invitation envoyée');
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (managerId: string) =>
      request(`/api/hosting/servers/${encodeURIComponent(serverId)}/managers/${encodeURIComponent(managerId)}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.show('Accès retiré');
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { invite, revoke };
}

export interface SubdomainSuffix {
  id: string;
  label: string;
}

export function useSuffixes() {
  return useQuery({
    queryKey: ['subdomain-suffixes'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/hosting/subdomain/suffixes');
      const list = Array.isArray(raw) ? raw : (raw?.subdomain_suffixes ?? raw?.suffixes ?? []);
      return (Array.isArray(list) ? list : [])
        .map(
          (s: any): SubdomainSuffix => ({
            id: String(s.id ?? ''),
            label: typeof s.label === 'string' ? s.label : String(s.id ?? ''),
          }),
        )
        .filter((s: SubdomainSuffix) => s.id);
    },
    staleTime: 5 * 60_000,
  });
}

export function useSubdomainMutations(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const run = async (method: 'POST' | 'PUT' | 'DELETE', body?: unknown) => {
    await request(`/api/hosting/servers/${encodeURIComponent(serverId)}/subdomain`, { method, body });
  };
  const save = useMutation({
    mutationFn: (body: { subdomain: string; suffix_id: string; exists: boolean }) =>
      run(body.exists ? 'PUT' : 'POST', { subdomain: body.subdomain, suffix_id: body.suffix_id }),
    onSuccess: async () => {
      toast.show('Sous-domaine enregistré');
      await invalidateServer(qc, serverId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => run('DELETE'),
    onSuccess: async () => {
      toast.show('Sous-domaine retiré');
      await invalidateServer(qc, serverId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { save, remove };
}

export function useConfirmServerActivity(serverId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () =>
      request(`/api/hosting/servers/${encodeURIComponent(serverId)}/confirm-activity`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: async () => {
      toast.show('Activité confirmée');
      await invalidateServer(qc, serverId);
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export async function fetchConsoleTicket(serverId: string): Promise<string> {
  const raw = await request<any>(`/api/hosting/servers/${encodeURIComponent(serverId)}/console/ticket`);
  const ticket = raw?.ticket;
  if (typeof ticket !== 'string' || !ticket) throw new Error('Console indisponible.');
  return ticket;
}

/** Le proxy local ne relaie pas le WebSocket : la socket part sur zenode.fr, le ticket suffit. */
export function consoleWebSocketUrl(serverId: string, ticket: string): string {
  const http = /8787|localhost|127\.0\.0\.1/.test(API_BASE) ? 'https://zenode.fr' : API_BASE;
  const ws = http.replace(/^http/i, 'ws');
  return `${ws}/api/hosting/servers/${encodeURIComponent(serverId)}/console?ticket=${encodeURIComponent(ticket)}`;
}

// ---------------------------------------------------------------- boutique

export interface ShopOffer {
  id: string;
  name: string;
  tagline: string;
  priceCents: number | null;
  currency: string;
  period: string | null;
  mode: string | null;
  locked: boolean;
  lockMessage: string | null;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  serviceType: string;
  orderable: boolean;
  offers: ShopOffer[];
}

export function useCatalog() {
  return useQuery<ShopProduct[]>({
    queryKey: ['shop-catalog'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/shop/catalog');
      const shop = raw?.shop ?? raw ?? {};
      const products = Array.isArray(shop.products) ? shop.products : [];
      return products.map((p: any): ShopProduct => ({
        id: String(p.id ?? p.slug ?? ''),
        slug: String(p.slug ?? p.id ?? ''),
        name: typeof p.name === 'string' ? p.name : 'Offre',
        description: typeof p.description === 'string' ? p.description : '',
        category: typeof p.category === 'string' ? p.category : '',
        serviceType: typeof p.service_type === 'string' ? p.service_type : '',
        orderable: p.orderable !== false,
        offers: (Array.isArray(p.offers) ? p.offers : []).map(
          (o: any): ShopOffer => ({
            id: String(o.id ?? ''),
            name: typeof o.name === 'string' ? o.name : 'Formule',
            tagline: typeof o.tagline === 'string' ? o.tagline : '',
            priceCents: typeof o.price_cents === 'number' ? o.price_cents : null,
            currency: typeof o.currency === 'string' ? o.currency : 'EUR',
            period: typeof o.billing_period === 'string' ? o.billing_period : null,
            mode: typeof o.acquisition_mode === 'string' ? o.acquisition_mode : null,
            locked: o.locked === true,
            lockMessage: typeof o.lock_message === 'string' ? o.lock_message : null,
          }),
        ),
      }));
    },
    staleTime: STALE_USER_MS,
  });
}

export interface OrderItem {
  id: string;
  number: string;
  title: string;
  status: string;
  amountCents: number | null;
  currency: string;
  createdAt: string | null;
}

export interface SubscriptionItem {
  id: string;
  title: string;
  status: string;
  amountCents: number | null;
  currency: string;
  period: string | null;
  periodEnd: string | null;
}

export function useOrders() {
  return useQuery<OrderItem[]>({
    queryKey: ['billing-orders'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/billing/orders');
      const list = Array.isArray(raw?.orders) ? raw.orders : [];
      return list.map(
        (o: any): OrderItem => ({
          id: String(o.order_id ?? o._id ?? ''),
          number: o.order_number != null ? String(o.order_number) : '',
          title:
            (typeof o.product_snapshot?.name === 'string' && o.product_snapshot.name) ||
            (typeof o.offer_snapshot?.name === 'string' && o.offer_snapshot.name) ||
            'Commande',
          status: typeof o.status === 'string' ? o.status : '',
          amountCents: typeof o.amount_cents === 'number' ? o.amount_cents : null,
          currency: typeof o.currency === 'string' ? o.currency : 'EUR',
          createdAt: typeof o.created_at === 'string' ? o.created_at : null,
        }),
      );
    },
  });
}

export function useSubscriptions() {
  return useQuery<SubscriptionItem[]>({
    queryKey: ['billing-subscriptions'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/billing/subscriptions');
      const list = Array.isArray(raw?.subscriptions) ? raw.subscriptions : [];
      return list.map(
        (s: any): SubscriptionItem => ({
          id: String(s.subscription_id ?? s._id ?? ''),
          title:
            (typeof s.product_snapshot?.name === 'string' && s.product_snapshot.name) ||
            (typeof s.offer_id === 'string' && s.offer_id) ||
            'Abonnement',
          status: typeof s.status === 'string' ? s.status : '',
          amountCents: typeof s.amount_cents === 'number' ? s.amount_cents : null,
          currency: typeof s.currency === 'string' ? s.currency : 'EUR',
          period: typeof s.billing_period === 'string' ? s.billing_period : null,
          periodEnd: typeof s.current_period_end === 'string' ? s.current_period_end : null,
        }),
      );
    },
  });
}

function pickUrl(raw: any): string | null {
  const url =
    raw?.checkout_url ||
    raw?.url ||
    raw?.portal_url ||
    raw?.session?.checkout_url ||
    raw?.checkout?.checkout_url;
  return typeof url === 'string' && url.startsWith('http') ? url : null;
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: Record<string, unknown> & { paid?: boolean }) => {
      const { paid, ...body } = input;
      const order = await request<any>('/api/shop/order', { method: 'POST', body });
      let url = pickUrl(order);
      const sessionId = order?.session_id || order?.session?.session_id;
      if (!url && typeof sessionId === 'string') {
        const session = await request<any>(`/api/billing/checkout/${encodeURIComponent(sessionId)}`);
        url = pickUrl(session);
      }
      if (!url && paid) {
        const checkout = await request<any>('/api/billing/checkout', { method: 'POST', body });
        url = pickUrl(checkout);
      }
      return { url };
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['billing-orders'] });
      await qc.invalidateQueries({ queryKey: ['billing-subscriptions'] });
      if (!res.url) toast.show('Commande enregistrée');
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useBillingPortal() {
  const toast = useToast();
  return useMutation({
    mutationFn: async () => {
      const raw = await request<any>('/api/billing/portal', { method: 'POST', body: {} });
      const url = pickUrl(raw);
      if (!url) throw new Error('Portail de paiement indisponible.');
      return url;
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function usePromoValidate() {
  return useMutation({
    mutationFn: (q: { code: string; productId?: string; offerId?: string }) => {
      const params = new URLSearchParams({ code: q.code });
      if (q.productId) params.set('product_id', q.productId);
      if (q.offerId) params.set('offer_id', q.offerId);
      return request<any>(`/api/shop/promo/validate?${params.toString()}`);
    },
  });
}

export function useRedeemCode() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (code: string) => request('/api/shop/redeem', { method: 'POST', body: { code } }),
    onSuccess: async () => {
      toast.show('Code utilisé');
      await qc.invalidateQueries({ queryKey: ['promo-history'] });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function usePromoHistory() {
  return useQuery<{ id: string; code: string; label: string; at: string | null }[]>({
    queryKey: ['promo-history'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/shop/promo/history');
      const list = Array.isArray(raw?.redemptions) ? raw.redemptions : [];
      return list.map((r: any) => ({
        id: String(r.redemption_id ?? r.id ?? r.code ?? Math.random()),
        code: typeof r.code === 'string' ? r.code : '',
        label: typeof r.label === 'string' ? r.label : typeof r.status === 'string' ? r.status : 'Code',
        at: typeof r.created_at === 'string' ? r.created_at : null,
      }));
    },
  });
}

// ------------------------------------------------------------------- compte

export function useSaveProfile() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: { display_name: string; bio: string; timezone: string }) =>
      request('/api/account/profile', { method: 'PATCH', body }),
    onSuccess: async () => {
      toast.show('Profil enregistré');
      await qc.invalidateQueries({ queryKey: keys.account });
      await qc.invalidateQueries({ queryKey: keys.me });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useSaveNotifications() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (email: { bot: boolean; hosting: boolean; security: boolean; product: boolean; dm: boolean }) =>
      request('/api/account/settings', {
        method: 'PUT',
        body: {
          notifications: {
            email: {
              bot: email.bot,
              hosting: email.hosting,
              security: email.security,
              product: email.product,
            },
            discord: { dm: email.dm },
          },
        },
      }),
    onSuccess: async () => {
      toast.show('Notifications enregistrées');
      await qc.invalidateQueries({ queryKey: keys.account });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
}

export function useEmailChange() {
  const qc = useQueryClient();
  const toast = useToast();
  const pending = useQuery({
    queryKey: ['email-pending'] as const,
    queryFn: () => request<any>('/api/account/email/pending'),
  });
  const requestCode = useMutation({
    mutationFn: (email: string) => request('/api/account/email/request', { method: 'POST', body: { email } }),
    onSuccess: async () => {
      toast.show('Code envoyé');
      await qc.invalidateQueries({ queryKey: ['email-pending'] });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const confirm = useMutation({
    mutationFn: (code: string) => request('/api/account/email/confirm', { method: 'POST', body: { code } }),
    onSuccess: async () => {
      toast.show('Adresse confirmée');
      await qc.invalidateQueries({ queryKey: ['email-pending'] });
      await qc.invalidateQueries({ queryKey: keys.account });
      await qc.invalidateQueries({ queryKey: keys.me });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { pending, requestCode, confirm };
}

export function useReferral() {
  return useQuery({
    queryKey: ['referral'] as const,
    queryFn: () => request<any>('/api/referral/me'),
    staleTime: STALE_LIST_MS,
  });
}

export interface ShortLink {
  id: string;
  code: string;
  target: string;
  shortUrl: string;
  hits: number | null;
}

export function useLinks() {
  return useQuery<{ quota: { max?: number; active?: number } | null; base: string; links: ShortLink[] }>({
    queryKey: ['links'] as const,
    queryFn: async () => {
      const raw = await request<any>('/api/link');
      const list = Array.isArray(raw?.links) ? raw.links : [];
      return {
        quota: raw?.quota ?? null,
        base: typeof raw?.public_base === 'string' ? raw.public_base : '',
        links: list.map(
          (l: any): ShortLink => ({
            id: String(l.id ?? l.code ?? ''),
            code: typeof l.code === 'string' ? l.code : '',
            target: typeof l.target_url === 'string' ? l.target_url : typeof l.target === 'string' ? l.target : '',
            shortUrl: typeof l.short_url === 'string' ? l.short_url : '',
            hits: typeof l.hits === 'number' ? l.hits : null,
          }),
        ),
      };
    },
  });
}

export function useLinkMutations() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['links'] });
  const create = useMutation({
    mutationFn: (body: { target_url: string; code?: string }) => request<any>('/api/link', { method: 'POST', body }),
    onSuccess: async () => {
      toast.show('Lien créé');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (code: string) => request(`/api/link/${encodeURIComponent(code)}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.show('Lien supprimé');
      await refresh();
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { create, remove };
}

// ---------------------------------------------------------------- adhérent

export function useAssociationHome() {
  return useQuery({
    queryKey: ['association-home'] as const,
    queryFn: () => request<any>('/api/association/home'),
  });
}

export function useAssociationCalendar() {
  return useQuery({
    queryKey: ['association-calendar'] as const,
    queryFn: () => request<any>('/api/association/calendar'),
  });
}

export function useAssociationNews() {
  return useQuery({
    queryKey: ['association-news'] as const,
    queryFn: () => request<any>('/api/association/announcements'),
  });
}

export function useAssociationDocs() {
  return useQuery({
    queryKey: ['association-docs'] as const,
    queryFn: () => request<any>('/api/association/documents'),
  });
}

export function useAssociationVotes() {
  return useQuery({
    queryKey: ['association-votes'] as const,
    queryFn: () => request<any>('/api/association/votes'),
  });
}

export function useAssociationActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const rsvp = useMutation({
    mutationFn: (body: { eventId: string; response: 'yes' | 'no' | 'proxy' }) =>
      request(`/api/association/calendar/${encodeURIComponent(body.eventId)}/rsvp`, {
        method: 'POST',
        body: { response: body.response, proxy_name: body.response === 'proxy' ? 'Procuration' : undefined },
      }),
    onSuccess: async () => {
      toast.show('Présence enregistrée');
      await qc.invalidateQueries({ queryKey: ['association-calendar'] });
      await qc.invalidateQueries({ queryKey: ['association-home'] });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  const vote = useMutation({
    mutationFn: (body: { voteId: string; optionId: string }) =>
      request(`/api/association/votes/${encodeURIComponent(body.voteId)}/ballot`, {
        method: 'POST',
        body: { option_id: body.optionId },
      }),
    onSuccess: async () => {
      toast.show('Vote enregistré');
      await qc.invalidateQueries({ queryKey: ['association-votes'] });
    },
    onError: (e) => toast.show(errorMessage(e)),
  });
  return { rsvp, vote };
}

export interface DocHit {
  title: string;
  summary: string;
  url: string;
}

export function useDocSearch(q: string) {
  return useQuery<DocHit[]>({
    queryKey: ['docs-search', q] as const,
    queryFn: async () => {
      const raw = await request<any>(`/api/public/docs/search?q=${encodeURIComponent(q)}`, { auth: false });
      const list = Array.isArray(raw?.results) ? raw.results : [];
      return list.map(
        (r: any): DocHit => ({
          title: typeof r.title === 'string' ? r.title : 'Document',
          summary: typeof r.summary === 'string' ? r.summary : '',
          url: `https://docs.zenode.fr/${encodeURIComponent(r.sectionSlug || '')}/${encodeURIComponent(r.slug || '')}`,
        }),
      );
    },
    enabled: q.trim().length >= 2,
  });
}

function normalizeManagers(raw: any): AccessManager[] {
  const list = Array.isArray(raw) ? raw : (raw?.managers ?? []);
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => ({
    id: String(m.manager_id ?? m.id ?? ''),
    email: typeof m.email === 'string' ? m.email : '',
    role: typeof m.role === 'string' ? m.role : null,
    status: typeof m.status === 'string' ? m.status : null,
  }));
}
