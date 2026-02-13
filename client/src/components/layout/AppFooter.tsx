import { Link } from "wouter";
import { MatangoLogo } from "@/components/brand/MatangoLogo";

export function AppFooter() {
  return (
    <footer className="py-12 border-t border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/">
            <MatangoLogo size={28} />
          </Link>
          <p className="text-sm text-muted-foreground">
            One loop. One brand brain. Always-on growth.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Matango.ai — All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
