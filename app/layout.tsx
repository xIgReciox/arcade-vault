import type { Metadata } from "next";
import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Juega online y compite por el puntaje más alto en Arcade Vault.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <AuthProvider>
          <div id="root">
            <Nav />
            <main className="av-main">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
