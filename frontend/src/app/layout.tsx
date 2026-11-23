import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Smile Score Admin Panel",
  description: "Administrative console for Smile Score recognition and employee management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#142D52] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
