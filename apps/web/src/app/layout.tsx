import './globals.css';

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
      <body className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
