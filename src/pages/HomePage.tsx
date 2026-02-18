import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, PieChart, Wallet, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <span className="text-xl font-extrabold text-foreground">💰 ExpenseBook</span>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard">
              <Button className="rounded-xl">Dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button className="rounded-xl">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight mb-4">
            Track Every Rupee,<br />
            <span className="text-primary">Effortlessly</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Organize expenses into notebooks, visualize spending by category, and stay on top of your finances.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="rounded-xl h-12 px-8 font-semibold text-base gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/login">
                <Button variant="outline" size="lg" className="rounded-xl h-12 px-8 font-semibold text-base">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-12"
        >
          {[
            { icon: <BookOpen className="h-6 w-6 text-primary" />, title: "Notebooks", desc: "Group expenses by trip, project, or month" },
            { icon: <PieChart className="h-6 w-6 text-accent" />, title: "Visual Insights", desc: "See where your money goes with charts" },
            { icon: <Wallet className="h-6 w-6 text-info" />, title: "Custom Categories", desc: "Create categories that fit your lifestyle" },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-2xl p-5 shadow-card text-left">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ExpenseBook
      </footer>
    </div>
  );
}
