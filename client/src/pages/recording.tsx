import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import StatusBar from "@/components/status-bar";
import BottomNavigation from "@/components/bottom-navigation";
import RecordingControls from "@/components/recording-controls";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { convertBlobToFile } from "@/lib/audio-utils";
import type { BookWithStats } from "@shared/schema";

export default function Recording() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("");
  const [currentChapter, setCurrentChapter] = useState<string>("");
  const [liveTranscription, setLiveTranscription] = useState<string>("");
  
  const {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error: recordingError,
  } = useAudioRecorder();

  const { data: books = [] } = useQuery<BookWithStats[]>({
    queryKey: ["/api/books?withStats=true"],
  });

  // Auto-select currently reading book
  useEffect(() => {
    const currentBook = books.find(book => book.status === 'reading');
    if (currentBook && !selectedBookId) {
      setSelectedBookId(currentBook.id);
      setCurrentChapter(currentBook.currentChapter || "");
      setCurrentPage(currentBook.currentPage?.toString() || "");
    }
  }, [books, selectedBookId]);

  const selectedBook = books.find(book => book.id === selectedBookId);

  const saveRecordingMutation = useMutation({
    mutationFn: async () => {
      if (!recordingState.audioBlob || !selectedBookId) {
        throw new Error("Missing audio or book selection");
      }

      const formData = new FormData();
      const audioFile = await convertBlobToFile(
        recordingState.audioBlob,
        `recording_${Date.now()}.webm`
      );
      
      formData.append("audio", audioFile);
      formData.append("bookId", selectedBookId.toString());
      
      if (currentPage) formData.append("page", currentPage);
      if (currentChapter) formData.append("chapter", currentChapter);

      const response = await apiRequest("POST", "/api/journal-entries", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recording Saved!",
        description: "Your voice note has been transcribed and saved.",
      });
      
      // Update query cache
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      // Clear recording and navigate
      clearRecording();
      setLiveTranscription("");
      navigate("/journal");
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save your recording. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartStop = () => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      if (!selectedBookId) {
        toast({
          title: "No Book Selected",
          description: "Please select a book before recording.",
          variant: "destructive",
        });
        return;
      }
      startRecording();
    }
  };

  const handlePause = () => {
    if (recordingState.isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handlePlayback = () => {
    if (recordingState.audioUrl) {
      const audio = new Audio(recordingState.audioUrl);
      audio.play().catch(console.error);
    }
  };

  const handleSave = () => {
    if (!recordingState.audioBlob) {
      toast({
        title: "No Recording",
        description: "Please record something before saving.",
        variant: "destructive",
      });
      return;
    }

    saveRecordingMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (recordingError) {
      toast({
        title: "Recording Error",
        description: recordingError,
        variant: "destructive",
      });
    }
  }, [recordingError, toast]);

  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      
      {/* Recording Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-gray-50 tap-target"
          >
            <i className="fas fa-times text-gray-600"></i>
          </button>
          
          <div className="text-center">
            <h2 className="font-semibold text-gray-800">Recording</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              {recordingState.isRecording && (
                <div className="w-2 h-2 bg-red-500 rounded-full recording-animation"></div>
              )}
              <span className="text-sm text-gray-500">
                {formatTime(recordingState.duration)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={!recordingState.audioBlob || saveRecordingMutation.isPending}
            className="p-2 rounded-full bg-blue-500 text-white disabled:opacity-50 tap-target"
          >
            {saveRecordingMutation.isPending ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-check"></i>
            )}
          </button>
        </div>
      </div>
      
      {/* Book Selection */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Book
          </label>
          <select
            value={selectedBookId || ""}
            onChange={(e) => setSelectedBookId(Number(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Choose a book...</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} by {book.author}
              </option>
            ))}
          </select>
        </div>
        
        {selectedBook && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <div className="w-12 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
              {selectedBook.coverUrl ? (
                <img 
                  src={selectedBook.coverUrl} 
                  alt={`${selectedBook.title} cover`}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <i className="fas fa-book text-gray-400"></i>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-gray-800 text-sm">{selectedBook.title}</h3>
              <p className="text-sm text-gray-500">{selectedBook.author}</p>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Chapter:</label>
                  <input
                    type="text"
                    value={currentChapter}
                    onChange={(e) => setCurrentChapter(e.target.value)}
                    className="w-16 px-2 py-1 text-xs border border-gray-200 rounded"
                    placeholder="Ch."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Page:</label>
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    className="w-16 px-2 py-1 text-xs border border-gray-200 rounded"
                    placeholder="000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Audio Visualization */}
      <div className="flex-1 px-6 py-8">
        <div className="text-center mb-6">
          {recordingState.isRecording && (
            <div className="waveform mb-6">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          )}
          
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              {recordingState.isRecording 
                ? (recordingState.isPaused ? "Recording paused" : "Recording...") 
                : "Tap to start recording"
              }
            </p>
            
            <RecordingControls
              isRecording={recordingState.isRecording}
              isPaused={recordingState.isPaused}
              onStartStop={handleStartStop}
              onPause={handlePause}
              onPlayback={handlePlayback}
            />
          </div>
        </div>
        
        {/* Live Transcription Preview */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-800">Transcription Preview</h4>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                saveRecordingMutation.isPending 
                  ? 'bg-yellow-500' 
                  : recordingState.audioBlob 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
              }`}></div>
              <span className="text-xs text-gray-500">
                {saveRecordingMutation.isPending 
                  ? 'Processing...' 
                  : recordingState.audioBlob 
                    ? 'Ready to save' 
                    : 'Waiting for recording'
                }
              </span>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 min-h-[60px] p-2 bg-gray-50 rounded">
            {liveTranscription || (
              <span className="text-gray-400 italic">
                Your transcription will appear here after recording...
              </span>
            )}
          </div>
          
          {/* Save Button */}
          {recordingState.audioBlob && !recordingState.isRecording && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={clearRecording}
                disabled={saveRecordingMutation.isPending}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg font-medium disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={() => saveRecordingMutation.mutate()}
                disabled={saveRecordingMutation.isPending || !selectedBookId}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveRecordingMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save Note
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}
