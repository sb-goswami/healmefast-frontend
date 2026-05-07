import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthContext";

const inter = Inter({ subsets: ["latin"] });
 
export const metadata = {
  title: "HealmeFast - AI Healthcare Assistant",
  description: "Advanced AI-powered healthcare assistant for medical report analysis and symptom triage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
          <div className="w-full min-h-screen">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
