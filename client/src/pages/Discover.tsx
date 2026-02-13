import { useState } from "react";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Heart, MessageCircle, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: publicInfluencers, isLoading } = trpc.influencer.getPublic.useQuery();

  // Filter influencers based on search query
  const filteredInfluencers = publicInfluencers?.filter(inf => {
    const tags = (inf.tags as string[]) || [];
    return (
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inf.bio && inf.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Discover Influencers</h1>
            <p className="text-muted-foreground">Find the perfect AI personality for your brand</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search influencers..." 
                className="pl-9 bg-white/5 border-white/10 focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading influencers...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInfluencers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Influencers Found</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery 
                ? `No influencers match "${searchQuery}". Try a different search term.`
                : "Be the first to create a public AI influencer!"}
            </p>
            <Link href="/create">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="w-4 h-4 mr-2" />
                Create Your Influencer
              </Button>
            </Link>
          </div>
        )}
        
        {/* Trending Section - Only show if we have influencers */}
        {!isLoading && filteredInfluencers.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl font-bold">Trending Today</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500">LIVE</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {filteredInfluencers.slice(0, 8).map((inf) => (
                <Link key={inf.id} href={`/influencer/${inf.id}`}>
                  <div className="flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary to-secondary group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full border-2 border-background overflow-hidden">
                        {inf.avatarUrl ? (
                          <img src={inf.avatarUrl} alt={inf.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-bold">
                            {inf.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-center truncate w-full group-hover:text-primary transition-colors">{inf.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Grid */}
        {!isLoading && filteredInfluencers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredInfluencers.map((inf, index) => {
              const tags = (inf.tags as string[]) || [];
              const stats = (inf.stats as { followers?: number; likes?: number; posts?: number }) || {};
              
              return (
                <motion.div
                  key={inf.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-card rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(204,255,0,0.1)]"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {inf.avatarUrl ? (
                      <img 
                        src={inf.avatarUrl} 
                        alt={inf.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-6xl font-bold text-white/30">{inf.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                    
                    {/* New badge for recently created */}
                    {new Date(inf.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary font-bold border-none">NEW</Badge>
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">
                            {inf.name} 
                            {inf.age && <span className="text-sm font-normal text-muted-foreground ml-1">{inf.age}</span>}
                          </h3>
                          {tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                        {inf.bio || "No bio yet"}
                      </p>
                      
                      {/* Stats */}
                      {(stats.followers || stats.likes) && (
                        <div className="flex gap-3 text-xs text-muted-foreground mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          {stats.followers && <span>{stats.followers.toLocaleString()} followers</span>}
                          {stats.likes && <span>{stats.likes.toLocaleString()} likes</span>}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        <Link href={`/influencer/${inf.id}`}>
                          <Button size="sm" variant="outline" className="w-full border-white/20 hover:bg-white/10 hover:text-white h-8 text-xs">
                            Profile
                          </Button>
                        </Link>
                        <Link href={`/chat/${inf.id}`}>
                          <Button size="sm" className="w-full bg-secondary hover:bg-secondary/90 text-white h-8 text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Chat
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
