import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Users,
  Briefcase,
  Tag,
  CalendarDays,
  Clock,
  TrendingUp,
  Settings,
  Receipt,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

const mainNav = [
  { to: "/utilisation", icon: Users, label: "Time & Utilisation" },
  { to: "/profitability", icon: TrendingUp, label: "Profitability" },
  { to: "/client-portfolio", icon: FolderKanban, label: "Client Portfolio" },
  { to: "/projects", icon: Briefcase, label: "Projects" },

  { to: "/fee-calculator", icon: CalendarDays, label: "Fee Calculator" },
];

const settingsNav = [
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/billable-work", icon: Receipt, label: "Billable Work" },
];

const NavItem = ({ item }: { item: { to: string; icon: React.ElementType; label: string } }) => (
  <NavLink
    to={item.to}
    end={item.to === "/projects"}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2.5 text-base font-display uppercase tracking-wide transition-colors",
        isActive
          ? "bg-primary text-black"
          : "text-white hover:bg-primary hover:text-black"
      )
    }
  >
    <item.icon className="h-4 w-4" />
    {item.label}
  </NavLink>
);

const AppLayout = () => {
  const { appUser, signOut, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-border">
        <div className="p-5 border-none bg-transparent rounded-none border-0 px-[20px]">
          <h1 className="font-display text-4xl font-bold tracking-tight text-primary">
            PRYZM
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 bg-transparent rounded-none">
          {mainNav.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="p-3 pt-0 border-t border-border mt-auto space-y-0.5 bg-transparent">
          <div className="pt-3 pb-1">
            <span className="flex items-center gap-2 px-3 text-sm font-display uppercase tracking-widest text-sidebar-foreground/50">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </span>
          </div>
          {settingsNav.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>
        
        <div className="p-3 border-t border-border bg-transparent">
          <div className="flex flex-col gap-2 px-3 py-2">
            <span className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</span>
            <button 
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto relative bg-[#faf8f5] text-stone-900">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
