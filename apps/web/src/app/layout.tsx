import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HomePilot',
  description: 'Goal-Oriented AI Home Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
