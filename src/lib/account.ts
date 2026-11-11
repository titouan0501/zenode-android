/** Vrai seulement si l'API a renvoyé une identité exploitable. */
export function hasAccountIdentity(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const body = raw as Record<string, unknown>;
  const user =
    body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : body;
  return [user.email, user.username, user.global_name, user.zenode_id, user.zenodeId].some(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
}
