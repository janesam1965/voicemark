import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  className?: string;
}

export default function BottomNavigation({ className }: BottomNavigationProps) {
  const [location, navigate] = useLocation();

  const navItems = [
    { path: "/", icon: "fas fa-home", label: "Home" },
    { path: "/recording", icon: "fas fa-microphone", label: "Record" },
    { path: "/journal", icon: "fas fa-book-open", label: "Journal" },
    { path: "/library", icon: "fas fa-library", label: "Library" },
  ];

  return (
    <div className={cn("absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100", className)}>
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center py-2 px-4 tap-target",
                isActive ? "text-blue-500" : "text-gray-400"
              )}
            >
              <i className={cn(item.icon, "text-lg mb-1")}></i>
              <span className={cn("text-xs", isActive && "font-medium")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
