import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import "@/app/globals.css";

const description =
  "James and Lisa are getting married. Find your invitation and RSVP here.";

/**
 * Link previews (WhatsApp, iMessage) need the image's full address, so set
 * NEXT_PUBLIC_SITE_URL to the live site. The image itself is
 * src/app/opengraph-image.jpg; the tab icon is src/app/icon.png.
 */
export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "James & Lisa | Traditional Wedding",
  description,
  openGraph: {
    type: "website",
    siteName: "James & Lisa",
    title: "James & Lisa are getting married",
    description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "James & Lisa are getting married",
    description,
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              borderRadius: "0.75rem",
            },
          }}
        />
      </body>
    </html>
  );
}
