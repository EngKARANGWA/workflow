import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workflow Engine",
  description: "Dynamic workflow & approval engine",
};

// Every route here is client-rendered behind auth (localStorage token) and gets
// nothing from static generation. Forcing dynamic rendering app-wide also sidesteps
// a Vercel build-output bug ("Unable to find lambda for route") that occurs when
// static and dynamic app-router pages share a route group's lambda mapping.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" closeButton theme="system" />
      </body>
    </html>
  );
}
