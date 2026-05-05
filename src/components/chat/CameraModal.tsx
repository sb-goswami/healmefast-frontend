import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    async function startCamera() {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
        onClose();
      }
    }
    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.png", {
              type: "image/png",
            });
            onCapture(file);
          }
        }, "image/png");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      <div className="absolute top-6 right-6 z-[110]">
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-lg border border-white/20"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden pt-16 pb-32">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain rounded-2xl shadow-2xl"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-8 pb-12 flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 right-0 z-[110]">
        <button
          onClick={handleCapture}
          className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 hover:border-slate-100 flex items-center justify-center transition-all shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
        >
          <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center">
              <Camera className="w-8 h-8 text-black" />
          </div>
        </button>
      </div>
    </div>
  );
}
