import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/navigation/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuroMap - Visual Second Brain",
  description: "Organize your knowledge visually using an infinite canvas, goals, tasks, and deadlines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-background text-foreground flex md:flex-row flex-col overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
          {children}
        </main>
        <Toaster theme="dark" closeButton />
      </body>
    </html>
  );
}
