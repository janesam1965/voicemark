import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import StatusBar from "@/components/status-bar";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertBookSchema } from "@shared/schema";
import type { BookWithStats } from "@shared/schema";
import { z } from "zod";

const bookFormSchema = insertBookSchema.extend({
  totalPages: z.coerce.number().optional(),
  currentPage: z.coerce.number().optional(),
});

export default function Library() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: books = [], isLoading } = useQuery<BookWithStats[]>({
    queryKey: ["/api/books?withStats=true"],
  });

  const form = useForm<z.infer<typeof bookFormSchema>>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      coverUrl: "",
      totalPages: undefined,
      currentPage: 0,
      currentChapter: "",
      status: "to_read",
    },
  });

  const addBookMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookFormSchema>) => {
      const response = await apiRequest("POST", "/api/books", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Book Added",
        description: "Your book has been added to the library.",
      });
      setIsAddBookOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add book. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBookStatusMutation = useMutation({
    mutationFn: async ({ bookId, status }: { bookId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/books/${bookId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update book status.",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Book Deleted",
        description: "The book and all its notes have been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the book. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentBook = books.find(book => book.status === 'reading');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reading':
        return '📖';
      case 'completed':
        return '✅';
      case 'paused':
        return '⏸️';
      default:
        return '🗓️';
    }
  };

  const handleStartReading = (bookId: number) => {
    updateBookStatusMutation.mutate({ bookId, status: 'reading' });
  };

  const handleDeleteBook = (bookId: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This will also delete all associated notes.`)) {
      deleteBookMutation.mutate(bookId);
    }
  };

  const onSubmit = (data: z.infer<typeof bookFormSchema>) => {
    addBookMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="flex-1 px-6 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
      
      {/* Library Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">My Library</h1>
          
          <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 text-white text-sm">
                <i className="fas fa-plus mr-2"></i>
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Add New Book</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title*</FormLabel>
                        <FormControl>
                          <Input placeholder="Book title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author*</FormLabel>
                        <FormControl>
                          <Input placeholder="Author name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isbn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ISBN</FormLabel>
                        <FormControl>
                          <Input placeholder="ISBN (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="totalPages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Pages</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="to_read">To Read</SelectItem>
                              <SelectItem value="reading">Reading</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddBookOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addBookMutation.isPending}
                      className="flex-1 bg-blue-500"
                    >
                      {addBookMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-plus mr-2"></i>
                      )}
                      Add Book
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 text-sm"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-6 py-4 pb-20 overflow-y-auto custom-scrollbar">
        {/* Currently Reading */}
        {currentBook && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Currently Reading</h3>
            
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 text-white">
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
                <div className="flex-1">
                  <h4 className="font-semibold">{currentBook.title}</h4>
                  <p className="text-sm opacity-90">{currentBook.author}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs opacity-75 mb-1">
                      <span>Progress</span>
                      <span>
                        {currentBook.currentPage || 0}
                        {currentBook.totalPages && ` / ${currentBook.totalPages} pages`}
                      </span>
                    </div>
                    {currentBook.totalPages && (
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min(100, ((currentBook.currentPage || 0) / currentBook.totalPages) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs opacity-90">
                    <span>📝 {currentBook.totalNotes} notes</span>
                    <span>🎵 {Math.round(currentBook.totalAudioTime / 60)}m audio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Book Collection */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">My Books</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg tap-target ${
                viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-600"
              }`}
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg tap-target ${
                viewMode === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-600"
              }`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
        
        {/* Books Display */}
        {filteredBooks.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-3"}>
            {filteredBooks.map((book) => (
              <div key={book.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
                viewMode === "grid" ? "p-3" : "p-4 flex items-center gap-4"
              }`}>
                <div className={viewMode === "grid" ? "mb-2" : ""}>
                  <div className={`bg-gray-200 rounded-lg flex items-center justify-center ${
                    viewMode === "grid" ? "w-full h-32" : "w-12 h-16"
                  }`}>
                    {book.coverUrl ? (
                      <img 
                        src={book.coverUrl} 
                        alt={`${book.title} cover`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <i className={`fas fa-book text-gray-400 ${
                        viewMode === "grid" ? "text-2xl" : "text-sm"
                      }`}></i>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-medium text-gray-800 line-clamp-2 ${
                    viewMode === "grid" ? "text-sm mb-1" : "text-base mb-2"
                  }`}>
                    {book.title}
                  </h4>
                  <p className={`text-gray-500 mb-2 ${viewMode === "grid" ? "text-xs" : "text-sm"}`}>
                    {book.author}
                  </p>
                  
                  <div className={`flex items-center justify-between text-xs text-gray-400 ${
                    viewMode === "grid" ? "" : "mb-2"
                  }`}>
                    <span>📝 {book.totalNotes} notes</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(book.status)}`}>
                      {getStatusIcon(book.status)} {book.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {viewMode === "list" && (
                    <div className="flex items-center gap-2 mt-3">
                      {book.status === 'to_read' && (
                        <Button
                          onClick={() => handleStartReading(book.id)}
                          size="sm"
                          className="bg-blue-500 text-xs"
                        >
                          Start Reading
                        </Button>
                      )}
                      <Button
                        onClick={() => navigate(`/journal?book=${book.id}`)}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        View Notes
                      </Button>
                      <Button
                        onClick={() => handleDeleteBook(book.id, book.title)}
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 border-red-200"
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <i className="fas fa-books text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {searchQuery ? "No books found" : "Your library is empty"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Add your first book to start tracking your reading journey"
              }
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setIsAddBookOpen(true)}
                className="bg-blue-500 text-white"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Your First Book
              </Button>
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
