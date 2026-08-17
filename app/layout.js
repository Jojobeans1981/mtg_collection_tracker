import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import Navbar from '../components/Navbar';

// Deliberately not using next/font/google here — this build environment has
// no outbound access to Google's font CDN, and next/font hangs indefinitely
// at build time trying to fetch it. Bold look is done with system fonts +
// weight/letter-spacing/gradient-text in CSS instead, no network required.

export const metadata = {
  title: 'MTG Vault — Collection & Market Values',
  description:
    'Track your Magic: The Gathering collection and see what you could sell each card for to a dealer vs. what a dealer sells it for.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="relative z-10 mx-auto max-w-5xl px-4 py-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
