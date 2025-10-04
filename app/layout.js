import "./globals.css";
import { Providers } from "./providers";

export const metadata = { title: "My UI" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
