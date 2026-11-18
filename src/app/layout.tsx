import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stock Market Mumbai Admin — Lead & Inquiry Desk',
  description: 'Private administrative lead portal for Stock Market Mumbai.',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#1E293B]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

