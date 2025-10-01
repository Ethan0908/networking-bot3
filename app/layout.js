import "./globals.css";

export const metadata = { title: "My UI" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">
        {children}
      </body>
    </html>
  );
}
