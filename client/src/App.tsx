import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Recording from "@/pages/recording";
import Journal from "@/pages/journal";
import Library from "@/pages/library";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recording" component={Recording} />
      <Route path="/journal" component={Journal} />
      <Route path="/library" component={Library} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-100">
          <div className="phone-container">
            <div className="phone-screen">
              <Toaster />
              <Router />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
