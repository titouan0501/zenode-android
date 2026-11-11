// Le callback OAuth (zenode://auth/callback?code=...&state=...) est traite par
// src/auth/session.tsx (Linking). Expo Router ne doit pas essayer de le naviguer
// vers une route inexistante, et le code ne doit jamais finir dans une URL de route.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  // Le scheme OAuth ne doit jamais ouvrir l'accueil : sans session, ça donne un écran vide.
  if (/auth\/callback/i.test(path)) return '/login';
  return path;
}
