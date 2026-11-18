import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenScience on macOS: a startup hang and a one-define fix (unofficial demo)",
  description:
    "The shipped OpenScience 2.0.153 macOS binary can print nothing, even for --version, while macOS waits on a network-volume permission check. Unofficial demo by Cheryl Aurelia.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
