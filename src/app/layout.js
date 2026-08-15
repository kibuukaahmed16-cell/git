import { Space_Mono, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display-family",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-family",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-family",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "T3RRI HUB — upload, edit, push to GitHub",
  description:
    "A browser workspace for developers: upload files or a whole zip, edit them, and push straight to GitHub from your phone, tablet, or computer.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "T3RRI HUB",
    description: "Upload, edit, and push files straight to GitHub from any device.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "T3RRI HUB",
    description: "Upload, edit, and push files straight to GitHub from any device.",
    images: ["/og-image.jpg"],
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport = {
  themeColor: "#15181d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="en" className={`${spaceMono.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AnnouncementBanner />
        {children}

        {/* Service worker: PWA install + push notifications */}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }`}
        </Script>

        {/* Google AdSense - only loads once NEXT_PUBLIC_ADSENSE_CLIENT_ID is set */}
        {adsenseId && (
          <Script
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
