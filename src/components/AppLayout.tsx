import { Outlet, useLocation, Link } from "react-router-dom";
import { Home, Wallet, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Spend", icon: Wallet, path: "/dashboard/spend" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function AppLayout() {
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card min-h-screen sticky top-0">
        <div className="p-5">
          <span className="text-lg font-extrabold text-foreground">💰 ExpenseBook</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors",
              isActive(item.path)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive(item.path) && "stroke-[2.5]")} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
