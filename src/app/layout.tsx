import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/layout/NavigationProgress";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KARE Lost & Found",
  description: "Privacy-first campus lost and found system for Kalasalingam University",
  keywords: ["lost and found", "campus", "university", "KARE", "Kalasalingam"],
  authors: [{ name: "KARE Security Office" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}
      >
        {children}
        <NavigationProgress />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
