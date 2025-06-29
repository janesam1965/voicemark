import { cn } from "@/lib/utils";

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartStop: () => void;
  onPause: () => void;
  onPlayback: () => void;
  className?: string;
}

export default function RecordingControls({
  isRecording,
  isPaused,
  onStartStop,
  onPause,
  onPlayback,
  className
}: RecordingControlsProps) {
  return (
    <div className={cn("flex justify-center gap-6", className)}>
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onPause}
          disabled={!isRecording}
          className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-50 tap-target"
        >
          <i className={cn("text-gray-600", isPaused ? "fas fa-play" : "fas fa-pause")}></i>
        </button>
        <span className="text-xs text-gray-500 font-medium">
          {isPaused ? "Resume" : "Pause"}
        </span>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onStartStop}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white text-xl tap-target",
            isRecording 
              ? "bg-red-500 recording-animation" 
              : "bg-blue-500"
          )}
        >
          <i className={isRecording ? "fas fa-stop" : "fas fa-microphone"}></i>
        </button>
        <span className="text-xs text-gray-700 font-medium">
          {isRecording ? "Stop" : "Record"}
        </span>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onPlayback}
          disabled={isRecording}
          className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-50 tap-target"
        >
          <i className="fas fa-play text-gray-600"></i>
        </button>
        <span className="text-xs text-gray-500 font-medium">
          Play
        </span>
      </div>
    </div>
  );
}
