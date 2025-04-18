import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swift — Talk to your codebase",
  description: "Swift is an AI tool that helps developers understand, navigate, and modify their codebase through natural language.",
  metadataBase: new URL('https://swift.com'),
  openGraph: {
    title: "Swift — Talk to your codebase",
    description: "Swift is an AI tool that helps developers understand, navigate, and modify their codebase through natural language.",
    type: "website",
    url: "https://swift.com",
    images: [{ url: "/swift-og.png", width: 1200, height: 630, alt: "Swift" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Swift — Talk to your codebase",
    description: "Swift is an AI tool that helps developers understand, navigate, and modify their codebase through natural language.",
    images: ["/swift-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-black dark:text-white bg-white dark:bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
