import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import StatusBar from "@/components/status-bar";
import BottomNavigation from "@/components/bottom-navigation";
import AudioPlayer from "@/components/audio-player";
import { formatAudioDuration, getRelativeTimeString } from "@/lib/audio-utils";
import type { BookWithStats, JournalEntryWithBook } from "@shared/schema";

export default function Home() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: books = [], isLoading: booksLoading } = useQuery<BookWithStats[]>({
    queryKey: ["/api/books?withStats=true"],
  });

  const { data: recentEntries = [], isLoading: entriesLoading } = useQuery<JournalEntryWithBook[]>({
    queryKey: ["/api/journal-entries?recent=true&limit=3"],
  });

  const currentBook = books.find(book => book.status === 'reading');

  if (statsLoading || booksLoading || entriesLoading) {
    return (
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="flex-1 px-6 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      
      {/* App Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">VoiceMark</h1>
            <p className="text-sm text-gray-500">Your reading companion</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/journal")}
              className="p-2 rounded-full bg-gray-50 tap-target"
            >
              <i className="fas fa-search text-gray-600"></i>
            </button>
            <button className="p-2 rounded-full bg-gray-50 tap-target">
              <i className="fas fa-cog text-gray-600"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 pb-20 overflow-y-auto custom-scrollbar">
        {/* Currently Reading */}
        {currentBook ? (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
            <h2 className="text-lg font-semibold mb-2">Currently Reading</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                {currentBook.coverUrl ? (
                  <img 
                    src={currentBook.coverUrl} 
                    alt={`${currentBook.title} cover`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <i className="fas fa-book text-2xl"></i>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{currentBook.title}</h3>
                <p className="text-sm opacity-90">{currentBook.author}</p>
                <p className="text-xs opacity-75 mt-1">
                  {currentBook.currentChapter && `${currentBook.currentChapter} • `}
                  Page {currentBook.currentPage || 0}
                  {currentBook.totalPages && ` of ${currentBook.totalPages}`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/recording")}
              className="w-full mt-4 bg-white/20 backdrop-blur rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-medium tap-target"
            >
              <i className="fas fa-microphone"></i>
              Quick Record
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-center">
            <i className="fas fa-book-open text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Book Selected</h3>
            <p className="text-gray-600 mb-4">Add a book from your library to start recording notes</p>
            <button 
              onClick={() => navigate("/library")}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium tap-target"
            >
              Browse Library
            </button>
          </div>
        )}
        
        {/* Recent Notes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Notes</h3>
            <button 
              onClick={() => navigate("/journal")}
              className="text-blue-500 text-sm font-medium tap-target"
            >
              View All
            </button>
          </div>
          
          {recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.chapter && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {entry.chapter}
                          </span>
                        )}
                        {entry.page && (
                          <span className="text-xs text-gray-500">Page {entry.page}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {getRelativeTimeString(new Date(entry.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {entry.transcription}
                      </p>
                    </div>
                    {entry.audioUrl && (
                      <div className="ml-3">
                        <AudioPlayer 
                          src={entry.audioUrl} 
                          className="!p-2 !bg-blue-50"
                          showDuration={false}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">{entry.book.title}</span> by {entry.book.author}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-sticky-note text-3xl mb-2"></i>
              <p>No notes yet. Start recording your thoughts!</p>
            </div>
          )}
        </div>
        
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-500">{stats.totalNotes}</div>
              <div className="text-xs text-gray-500">Total Notes</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-500">{stats.totalBooks}</div>
              <div className="text-xs text-gray-500">Books</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-yellow-500">
                {formatAudioDuration(stats.totalAudioTime)}
              </div>
              <div className="text-xs text-gray-500">Audio</div>
            </div>
          </div>
        )}
      </div>
      
      <BottomNavigation />
      
      {/* Floating Record Button */}
      <button 
        onClick={() => navigate("/recording")}
        className="floating-record-btn"
      >
        <i className="fas fa-microphone"></i>
      </button>
    </div>
  );
}
