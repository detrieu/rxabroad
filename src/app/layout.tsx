import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Public_Sans, Spectral } from 'next/font/google';
import { Masthead } from '@/components/Masthead';
import { Footer } from '@/components/Footer';
import { headInitScript } from '@/lib/theme';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import './globals.css';

const spectral = Spectral({
  variable: '--font-spectral',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    'Look up what a medicine is called abroad. Search a brand, generic name, or destination to see the local brand, ' +
    'prescription status, and travel cautions across 14 countries.',
  openGraph: { siteName: SITE_NAME, type: 'website' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1efe2' },
    { media: '(prefers-color-scheme: dark)', color: '#141d17' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${spectral.variable} ${publicSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: headInitScript }} />
      </head>
      <body>
        <div className="ribbon" />
        <div className="page">
          <Masthead />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
