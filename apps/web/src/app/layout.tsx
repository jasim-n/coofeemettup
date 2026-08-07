import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { RequestsBadgeProvider } from "@/components/requests-badge";
import { DesktopNav } from "@/components/desktop-nav";

// Design System v2.0 — Poppins across the whole product (headings + body).
const heading = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const body = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coffee Meetups — meet interesting people over coffee",
  description: "Small groups. Real conversations. Good coffee. Islamabad & Lahore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <RequestsBadgeProvider>
            <DesktopNav />
            {children}
          </RequestsBadgeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
