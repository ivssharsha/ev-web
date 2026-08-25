import React, { useState, useRef, useEffect } from 'react';
import { Play, Volume2, VolumeX, ArrowRight, Sparkles, Zap } from 'lucide-react';

interface IntroSplashProps {
  onComplete: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Trigger completion with smooth fade out
  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  // Video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      const pct = (current / total) * 100;
      setProgress(pct);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((_err) => {
        // In case autoplay is restricted, keep muted and try again
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }

    // Safety timeout: in case video fails or gets stuck, dismiss after 10s
    const timeout = setTimeout(() => {
      handleFinish();
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#050811] flex flex-col items-center justify-center transition-all duration-700 ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Top Header Controls */}
      <div className="absolute top-6 inset-x-6 sm:inset-x-12 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white font-['Space_Grotesk']">
              EVOLT
            </span>
            <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Smart Network
            </span>
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleFinish}
          className="group px-4 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md text-xs font-bold flex items-center gap-2 transition-all shadow-xl hover:border-emerald-500/50"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Main Video Frame */}
      <div className="relative w-full max-w-4xl px-4 z-10 flex flex-col items-center">
        
        {/* Glow Border Wrap */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] border border-slate-800 bg-slate-950/80 backdrop-blur-xl">
          
          <video
            ref={videoRef}
            src="/intro-animation.mp4"
            playsInline
            autoPlay
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleFinish}
            onError={() => setVideoError(true)}
            className="w-full h-auto max-h-[68vh] object-contain mx-auto"
          />

          {/* Fallback if browser can't load local path */}
          {videoError && (
            <div className="p-12 text-center space-y-4">
              <Sparkles className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-xl font-bold text-white">Welcome to EVolt</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Next-Gen Smart EV SuperCharge Platform & Real-Time Navigation.
              </p>
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs"
              >
                Enter Platform
              </button>
            </div>
          )}

          {/* Bottom Floating Video HUD Controls */}
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between p-2 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) {
                      videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                  }
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Play / Pause"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                  }
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                EVolt Intro Animation
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {Math.round(progress)}%
              </span>
              <button
                onClick={handleFinish}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all shadow-md flex items-center gap-1"
              >
                <span>Enter App</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Video progress indicator line */}
        <div className="w-full mt-4 bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-150"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

      </div>

    </div>
  );
};
