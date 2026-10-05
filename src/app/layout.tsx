import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, IBM_Plex_Mono } from 'next/font/google';
import { Masthead } from '@/components/Masthead';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import { headInitScript } from '@/lib/theme';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';
import './globals.css';

const bricolage = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'] });
const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const plexMono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    'Look up what a medicine is called abroad. Search a brand, generic name, or destination to see the local brand, ' +
    'prescription status, and travel cautions across 14 countries.',
  openGraph: { siteName: SITE_NAME, type: 'website' },
};

export const viewport: Viewport = {
  // Matches the navy passport-cover header in each theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1b2a57' },
    { media: '(prefers-color-scheme: dark)', color: '#070d1c' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={cn(bricolage.variable, geist.variable, plexMono.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>
          <Masthead />
          <div className="flex-1">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
