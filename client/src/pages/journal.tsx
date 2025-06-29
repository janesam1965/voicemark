import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import StatusBar from "@/components/status-bar";
import BottomNavigation from "@/components/bottom-navigation";
import AudioPlayer from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getRelativeTimeString } from "@/lib/audio-utils";
import type { JournalEntryWithBook } from "@shared/schema";

export default function Journal() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "week" | "favorites">("all");

  const { data: allEntries = [], isLoading } = useQuery<JournalEntryWithBook[]>({
    queryKey: ["/api/journal-entries"],
  });

  const { data: favoriteEntries = [] } = useQuery<JournalEntryWithBook[]>({
    queryKey: ["/api/journal-entries?favorites=true"],
    enabled: filterType === "favorites",
  });

  const { data: searchResults = [] } = useQuery<JournalEntryWithBook[]>({
    queryKey: ["/api/journal-entries/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest("POST", `/api/journal-entries/${entryId}/favorite`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/journal-entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Entry Deleted",
        description: "The journal entry has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter entries based on current filter type and search
  const getFilteredEntries = () => {
    if (searchQuery.length > 2) {
      return searchResults;
    }

    let entries = allEntries;
    
    if (filterType === "favorites") {
      entries = favoriteEntries;
    } else if (filterType === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      entries = allEntries.filter(entry => 
        new Date(entry.createdAt) >= weekAgo
      );
    }
    
    return entries;
  };

  const filteredEntries = getFilteredEntries();

  const handleToggleFavorite = (entryId: number) => {
    toggleFavoriteMutation.mutate(entryId);
  };

  const handleDeleteEntry = (entryId: number) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteEntryMutation.mutate(entryId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="flex-1 px-6 py-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
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
      
      {/* Journal Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">My Journal</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full bg-gray-50 tap-target">
              <i className="fas fa-filter text-gray-600"></i>
            </button>
            <button className="p-2 rounded-full bg-gray-50 tap-target">
              <i className="fas fa-download text-gray-600"></i>
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 text-sm"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 tap-target"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 text-sm rounded-full ${
              filterType === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All Notes
          </button>
          <button
            onClick={() => setFilterType("week")}
            className={`px-4 py-2 text-sm rounded-full ${
              filterType === "week"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilterType("favorites")}
            className={`px-4 py-2 text-sm rounded-full ${
              filterType === "favorites"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Favorites
          </button>
        </div>
      </div>
      
      {/* Journal Entries */}
      <div className="flex-1 px-6 py-4 pb-20 overflow-y-auto custom-scrollbar">
        {filteredEntries.length > 0 ? (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-10 bg-gray-200 rounded flex items-center justify-center">
                      {entry.book.coverUrl ? (
                        <img 
                          src={entry.book.coverUrl} 
                          alt={`${entry.book.title} cover`}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <i className="fas fa-book text-gray-400 text-xs"></i>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-gray-800">{entry.book.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.chapter && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {entry.chapter}
                          </span>
                        )}
                        {entry.page && (
                          <span className="text-xs text-gray-500">Page {entry.page}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {getRelativeTimeString(new Date(entry.createdAt))}
                    </span>
                    <button
                      onClick={() => handleToggleFavorite(entry.id)}
                      disabled={toggleFavoriteMutation.isPending}
                      className="p-1 rounded-full bg-gray-50 tap-target"
                    >
                      <i className={`fas fa-heart text-xs ${
                        entry.isFavorite ? "text-red-500" : "text-gray-400"
                      }`}></i>
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {entry.transcription}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {entry.audioUrl && (
                      <AudioPlayer 
                        src={entry.audioUrl}
                        className="!p-2 !bg-blue-50"
                        showDuration={true}
                      />
                    )}
                    <button 
                      onClick={() => {
                        // Share functionality would go here
                        toast({
                          title: "Share Feature",
                          description: "Share functionality coming soon!",
                        });
                      }}
                      className="p-2 rounded-lg bg-gray-50 tap-target"
                    >
                      <i className="fas fa-share text-xs text-gray-600"></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                      className="p-2 rounded-lg bg-red-50 text-red-600 tap-target"
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                    <button className="text-xs text-gray-400 tap-target">
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <i className="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {searchQuery ? "No matching entries" : "No journal entries yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Start recording your thoughts while reading"
              }
            </p>
            {!searchQuery && (
              <button 
                onClick={() => navigate("/recording")}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium tap-target"
              >
                <i className="fas fa-microphone mr-2"></i>
                Record Your First Note
              </button>
            )}
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
