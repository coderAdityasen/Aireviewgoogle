import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ReviewFlow",
  description: "Collect genuine customer feedback through QR-powered review flows."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased`}>
        {children}
        <Toaster richColors closeButton position="top-center" toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
