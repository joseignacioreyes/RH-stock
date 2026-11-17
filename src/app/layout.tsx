import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { SITIO_URL } from "@/lib/config";
import "./globals.css";

// Poppins para títulos y logo; Inter para el resto del texto.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const descripcion =
  "App de inventario para almacenes y negocios de barrio de Puente Alto. Sácale una foto a tu boleta y tu stock se actualiza solo.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO_URL),
  title: {
    default: "RH Stock: Tu inventario con una foto",
    template: "%s | RH Stock",
  },
  description: descripcion,
  applicationName: "RH Stock",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "RH Stock",
    title: "RH Stock: Tu inventario con una foto",
    description: descripcion,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "RH Stock", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// No se limita el zoom: mucha gente agranda la letra en el celular.
export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
