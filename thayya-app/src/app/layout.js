import './globals.css';
export const metadata = {
  title: 'Thayya | Move. Rise. Shine.',
  description: 'Indian dance-based fitness movement',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,500;12..96,700;12..96,800&family=Outfit:wght@300;400;500;600;700&family=Caveat+Brush&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}