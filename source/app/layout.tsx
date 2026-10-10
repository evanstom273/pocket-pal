import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Pal",
  description: "A little Piplet, a world of small moments. Your private, persistent virtual pet.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('pocket-pal-theme-v1')==='light'?'light':'dark'}catch{}"}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
