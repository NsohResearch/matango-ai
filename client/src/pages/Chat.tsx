import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Chat() {
  const [match, params] = useRoute("/chat/:id");
  const influencerId = match ? parseInt(params.id) : 0;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: influencer, isLoading: loadingInfluencer, error: influencerError } = trpc.influencer.get.useQuery(
    { id: influencerId },
    { enabled: !!influencerId }
  );

  const { 
    data: messages, 
    isLoading: loadingMessages, 
    refetch,
    error: messagesError 
  } = trpc.chat.getMessages.useQuery(
    { influencerId },
    { 
      enabled: !!influencerId && isAuthenticated,
      refetchInterval: false, // Don't auto-refetch to avoid interrupting typing
    }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
      // Focus back on input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: error.message || "Please try again",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, sendMessageMutation.isPending]);

  // Focus input on mount
  useEffect(() => {
    if (isAuthenticated && !loadingInfluencer) {
      inputRef.current?.focus();
    }
  }, [isAuthenticated, loadingInfluencer]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;
    
    if (trimmedMessage.length > 2000) {
      toast.error("Message too long", {
        description: "Please keep your message under 2000 characters",
      });
      return;
    }
    
    sendMessageMutation.mutate({ influencerId, message: trimmedMessage });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (loadingInfluencer || authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Auth required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Please sign in to chat with your AI influencers
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In to Continue
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Error state
  if (influencerError) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Unable to Load Chat</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            {influencerError.message || "The influencer could not be found or you don't have access."}
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not found
  if (!influencer) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Influencer Not Found</h1>
          <p className="text-muted-foreground mb-8">
            This influencer doesn't exist or has been removed.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 pt-20 pb-4 flex flex-col max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 py-4 border-b border-white/10">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <Avatar className="w-12 h-12 border-2 border-primary/50">
            <AvatarImage src={influencer.avatarUrl || undefined} alt={influencer.name} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {influencer.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="font-bold text-lg">{influencer.name}</h1>
            <p className="text-sm text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Influencer • Online
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="hover:bg-white/5"
            title="Refresh messages"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 py-4" ref={scrollRef}>
          <div className="space-y-4 min-h-full">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messagesError ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">Failed to load messages</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : messages && messages.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "assistant" && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={influencer.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {influencer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-white/10 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Say hi to {influencer.name}! They're excited to chat with you and powered by advanced AI.
                </p>
              </div>
            )}

            {/* Typing indicator */}
            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[80%]">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={influencer.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {influencer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="px-4 py-3 rounded-2xl bg-card border border-white/10 rounded-bl-md">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-xs text-muted-foreground ml-2">{influencer.name} is typing...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="py-4 border-t border-white/10">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${influencer.name}...`}
                className="flex-1 bg-card border-white/10 focus:border-primary/50 pr-16"
                disabled={sendMessageMutation.isPending}
                maxLength={2000}
              />
              {message.length > 1800 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${message.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>
                  {message.length}/2000
                </span>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending || message.length > 2000}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by AI • Responses are generated and may not always be accurate
          </p>
        </div>
      </div>
    </div>
  );
}
