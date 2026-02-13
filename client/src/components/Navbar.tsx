import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Brain, Layers, Target, Users, BarChart3, Video, Image, Beaker, Share2, Palette, Film, Building2, Sparkles, Key, TrendingUp, Settings, Camera, BookOpen, FolderOpen } from "lucide-react";
import { MatangoLogo } from "@/components/brand/MatangoLogo";
import { BrandSwitcher } from "@/components/BrandSwitcher";

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { name: "About", path: "/about" },
    { name: "Pricing", path: "/pricing" },
  ];

  // Canonical workflow order: Brand Brain → Influencer Studio → Video Scripts → Video Studio → AAO → Campaign Factory
  const systemFeatures = [
    { 
      name: "Brand Brain", 
      path: "/brand-brain", 
      icon: Brain, 
      desc: "Your brand memory",
      verb: "Build"
    },
    { 
      name: "Influencer Studio", 
      path: "/influencer-studio", 
      icon: Camera, 
      desc: "Upload, train & create",
      verb: "Create"
    },
    { 
      name: "Video Scripts", 
      path: "/video-scripts", 
      icon: Film, 
      desc: "AI script generator",
      verb: "Script"
    },
    { 
      name: "Video Studio", 
      path: "/video-studio", 
      icon: Video, 
      desc: "Generate & edit videos",
      verb: "Produce"
    },
    { 
      name: "AAO Studio", 
      path: "/aao-studio", 
      icon: Image, 
      desc: "Deploy AI operators",
      verb: "Deploy"
    },
    { 
      name: "Asset Library", 
      path: "/asset-library", 
      icon: FolderOpen, 
      desc: "Create & manage images",
      verb: "Create"
    },
    { 
      name: "Story Studio", 
      path: "/story-studio", 
      icon: BookOpen, 
      desc: "Multi-scene stories",
      verb: "Story"
    },
    { 
      name: "Bulk Create", 
      path: "/bulk-create", 
      icon: Layers, 
      desc: "Mass image generation",
      verb: "Batch"
    },
    { 
      name: "Campaign Factory", 
      path: "/campaign-factory", 
      icon: Layers, 
      desc: "Multi-channel assets",
      verb: "Generate"
    },
    { 
      name: "Meet K'ah", 
      path: "/meet-kah", 
      icon: Sparkles, 
      desc: "Our lead AAO",
      verb: "Meet"
    },
  ];

  const growthFeatures = [
    { 
      name: "Publish & Track", 
      path: "/social-connections", 
      icon: Target, 
      desc: "Schedule everywhere",
      verb: "Publish"
    },
    { 
      name: "Leads & CRM", 
      path: "/leads", 
      icon: Users, 
      desc: "Capture & nurture",
      verb: "Capture"
    },
    { 
      name: "Analytics Hub", 
      path: "/analytics-hub", 
      icon: BarChart3, 
      desc: "Unified insights",
      verb: "Learn"
    },
    { 
      name: "A/B Testing", 
      path: "/ab-testing", 
      icon: Beaker, 
      desc: "Optimize campaigns",
      verb: "Test"
    },
  ];

  const agencyFeatures = [
    { 
      name: "Team & Sharing", 
      path: "/team", 
      icon: Share2, 
      desc: "Collaborate",
      verb: "Share"
    },
    { 
      name: "White Label", 
      path: "/white-label", 
      icon: Palette, 
      desc: "Custom branding",
      verb: "Brand"
    },
    { 
      name: "AI Providers", 
      path: "/ai-providers", 
      icon: Key, 
      desc: "BYOK API keys",
      verb: "Connect"
    },
    { 
      name: "Usage Analytics", 
      path: "/usage-analytics", 
      icon: TrendingUp, 
      desc: "Cost & usage tracking",
      verb: "Track"
    },
    { 
      name: "Account Settings", 
      path: "/account-settings", 
      icon: Settings, 
      desc: "Manage your account",
      verb: "Settings"
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center group">
          <MatangoLogo size={28} />
        </Link>

        {/* Brand Switcher - only show when authenticated */}
        {isAuthenticated && (
          <div className="hidden md:block border-l border-border pl-4 ml-2">
            <BrandSwitcher />
          </div>
        )}

        <div className="hidden md:flex items-center gap-6">
          {/* The System Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                The System
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 bg-background/95 backdrop-blur-md border-border p-2">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                Build & Create
              </DropdownMenuLabel>
              {systemFeatures.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link href={item.path} className="flex items-center gap-3 w-full px-2 py-2 cursor-pointer rounded-md hover:bg-primary/10">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <span className="text-xs text-primary font-medium">{item.verb}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                Publish & Learn
              </DropdownMenuLabel>
              {growthFeatures.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link href={item.path} className="flex items-center gap-3 w-full px-2 py-2 cursor-pointer rounded-md hover:bg-primary/10">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <span className="text-xs text-primary font-medium">{item.verb}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                Scale & Customize
              </DropdownMenuLabel>
              {agencyFeatures.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link href={item.path} className="flex items-center gap-3 w-full px-2 py-2 cursor-pointer rounded-md hover:bg-primary/10">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <span className="text-xs text-primary font-medium">{item.verb}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  {user?.name || user?.email || "Account"}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-border">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Your Growth Loop
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="w-full cursor-pointer">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/brand-brain" className="w-full cursor-pointer flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Brand Brain
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="w-full cursor-pointer">
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="w-full cursor-pointer flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    Admin Portal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <a href={getLoginUrl()}>
                <Button variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-6">
                  Deploy Your AAO
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
