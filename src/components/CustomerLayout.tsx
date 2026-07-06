import { LogOut, LayoutDashboard, Home, Calendar, Heart, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS } from "@/lib/siteContent";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/portal", icon: Home, label: "Home" },
  { to: "/portal/bookings", icon: Calendar, label: "Bookings" },
  { to: "/portal/style-diary", icon: Heart, label: "Style Diary" },
  { to: "/portal/settings", icon: Settings, label: "Settings" },
];

const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, profile, hasRole } = useAuth();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  const isAdmin = hasRole("admin") || hasRole("super_admin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button className="sm:hidden p-2" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
              {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex flex-col">
              <span className="font-display text-2xl leading-none" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>{BUSINESS.name}</span>
              <span className="eyebrow text-[9px] mt-0.5">Client Portal</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-[11px] uppercase tracking-[0.18em] gap-1">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="hidden sm:block border-b border-border bg-background">
        <div className="mx-auto max-w-5xl flex gap-6 px-4">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 py-4 text-[11px] uppercase tracking-[0.22em] border-b-2 transition-colors",
                location.pathname === item.to
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {mobileNav && (
        <div className="sm:hidden fixed inset-0 top-16 z-40 bg-background border-t border-border">
          <div className="p-4 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNav(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-border",
                  location.pathname === item.to ? "text-primary" : "text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
    </div>
  );
};

export default CustomerLayout;
