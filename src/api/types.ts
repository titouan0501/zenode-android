export type Provider = 'discord' | 'google' | 'github';
export const KNOWN_PROVIDERS: Provider[] = ['discord', 'google', 'github'];

export interface AuthConfig {
  login_path: string;
  token_path: string;
  refresh_path: string;
  providers: string[];
  redirect_schemes: string[];
  access_ttl_seconds: number;
  refresh_ttl_seconds: number;
}

export interface MobileUser {
  zenodeId: string | null;
  email: string | null;
  username: string | null;
  global_name: string | null;
  avatar_url: string | null;
  authProvider?: string | null;
  hasDiscordLinked?: boolean;
  hasGoogleLinked?: boolean;
  hasGithubLinked?: boolean;
}

export interface TokenResponse {
  token_type: 'Bearer';
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  user: MobileUser;
}

export interface MobileSession {
  session_id: string;
  device_name: string | null;
  auth_provider: string | null;
  created_at: string | null;
  last_used_at: string | null;
  current: boolean;
}

/** GET /api/user */
export interface Me {
  global_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  zenode_id?: string | null;
  bot_limit?: number | null;
  bot_quota_used?: number | null;
  hasDiscordLinked?: boolean;
  hasGoogleLinked?: boolean;
  hasGithubLinked?: boolean;
  authProvider?: string | null;
  isAssociationMember?: boolean;
  hasStaffAccess?: boolean;
}

/** GET /api/account/full (champs utilises) */
export interface AccountFull {
  profile?: {
    account_status?: string | null;
    email?: string | null;
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}

export interface HostServer {
  server_id?: string;
  id?: string;
  name?: string;
  status?: string | null;
  runtime_status?: string | null;
  pelican_server_id?: unknown;
  review_blocked?: boolean | null;
  automod_blocked?: boolean | null;
  abuse_state?: string | null;
  tier_compliance?: { state?: string | null } | null;
  plan_summary?: {
    offer_name?: string | null;
    product_name?: string | null;
    memory_mb?: number | null;
    disk_mb?: number | null;
    cpu_percent?: number | null;
  } | null;
  subdomain?: { fqdn?: string | null } | null;
  allocation?: unknown;
  is_owner?: boolean;
  access_role?: string | null;
  error_message?: string | null;
  automod_message?: string | null;
  is_free?: boolean;
  activity_confirmation?: unknown;
  [k: string]: unknown;
}
