import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-400/10 rounded-full blur-[80px]" />
      
      <div className="relative z-10 w-full flex justify-center px-4">
        {children}
      </div>
      
      {/* Footer / Info */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-white/20 text-xs">
        &copy; 2026 Health AI Assistant. Secure & Encrypted.
      </div>
    </div>
  );
}
