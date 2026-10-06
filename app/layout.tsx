import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./command.css";
import "./glass.css";
import "./monochrome.css";
import { CivicProvider } from "@/components/CivicProvider";
import { Shell } from "@/components/Shell";
import { LanguageProvider } from "@/components/LanguageProvider";
export const metadata: Metadata = {
  title: "CivicPulse — Every report. A better city.",
  description:
    "Report city problems. Help authorities fix what matters first. CivicPulse civic intelligence demo for Bengaluru.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <CivicProvider>
            <Shell>{children}</Shell>
          </CivicProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
