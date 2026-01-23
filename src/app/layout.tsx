import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RemodelFlow - Project Management Platform",
  description: "Manage remodeling projects with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
