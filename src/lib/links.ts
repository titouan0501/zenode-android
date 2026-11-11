import * as WebBrowser from 'expo-web-browser';

const SITE = 'https://zenode.fr';

export const URLS = {
  shop: `${SITE}/app/shop`,
  billing: `${SITE}/app/billing`,
  profile: `${SITE}/app/profile`,
  adherent: `${SITE}/app/adherent`,
  status: `${SITE}/app/status`,
  docs: 'https://docs.zenode.fr',
  // TODO : remplacer par l'invitation Discord communautaire quand elle est connue.
  discord: SITE,
  staff: 'https://staff.zenode.fr',
  serverPage: (serverId: string) => `${SITE}/app/service/server/${encodeURIComponent(serverId)}`,
} as const;

/** Ouvre une page du site dans un Chrome Custom Tab. */
export async function openWeb(url: string, colors?: { toolbar?: string; control?: string }) {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors?.toolbar,
      controlsColor: colors?.control,
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch {
    // rien : le navigateur n'a pas pu s'ouvrir
  }
}