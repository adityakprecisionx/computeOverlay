import type { Metadata } from "next";
import "./globals.css";
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: "Metro Compute Overlay - DFW",
  description: "Compare cloud, colo data centers, and GridSite containers based on latency and cost for the Dallas-Fort Worth metro area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {
                  // Silently ignore service worker registration errors
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
