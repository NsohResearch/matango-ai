import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Send, 
  Sparkles, 
  MessageSquare,
  Trash2,
  RefreshCw,
  FileText,
  Video,
  Target,
  HelpCircle,
  Wrench
} from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  contextType: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export default function MeetKahPage() {
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [contextType, setContextType] = useState<string>("general");
  const scrollRef = useRef<HTMLDivElement>(null);

  // tRPC queries and mutations
  const { data: chatHistory, refetch: refetchHistory } = trpc.kahChat.getHistory.useQuery();
  
  const sendMessage = trpc.kahChat.chat.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const clearHistory = trpc.kahChat.clearHistory.useMutation({
    onSuccess: () => {
      toast.success("Chat history cleared");
      refetchHistory();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate({
      message: message.trim(),
      contextType: contextType as "general" | "script_help" | "video_help" | "marketing_advice" | "platform_guidance" | "troubleshooting",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const contextOptions = [
    { value: "general", label: "General", icon: MessageSquare, description: "General questions and chat" },
    { value: "script_help", label: "Script Help", icon: FileText, description: "Help with video scripts" },
    { value: "video_help", label: "Video Help", icon: Video, description: "Video generation assistance" },
    { value: "marketing_advice", label: "Marketing", icon: Target, description: "Marketing strategy advice" },
    { value: "platform_guidance", label: "Platform", icon: HelpCircle, description: "How to use Matango.ai" },
    { value: "troubleshooting", label: "Troubleshoot", icon: Wrench, description: "Fix issues and errors" },
  ];

  const quickPrompts = [
    "How do I create an effective TikTok hook?",
    "What's the best aspect ratio for Instagram Reels?",
    "Help me write a script for my product launch",
    "How do I use the Video Studio?",
    "What makes a good call-to-action?",
  ];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src="/images/kah-avatar.png" alt="K'ah" />
              <AvatarFallback className="bg-primary text-primary-foreground">K</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Meet K'ah
                <Sparkles className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-muted-foreground text-sm">
                Your AI marketing guide and platform assistant
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>

        <div className="flex-1 grid lg:grid-cols-4 gap-4 min-h-0">
          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col min-h-0">
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {chatHistory && chatHistory.length > 0 ? (
                  <div className="space-y-4">
                    {chatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          msg.role === "user" ? "flex-row-reverse" : ""
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {msg.role === "user" ? (
                            <>
                              <AvatarImage src="" />
                              <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src="/images/kah-avatar.png" />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">K</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <Streamdown>{msg.content}</Streamdown>
                          <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                            <Badge variant="outline" className="text-[10px]">
                              {msg.contextType}
                            </Badge>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {sendMessage.isPending && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src="/images/kah-avatar.png" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">K</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">K'ah is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Avatar className="h-20 w-20 mb-4 border-2 border-primary">
                      <AvatarImage src="/images/kah-avatar.png" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">K</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-semibold mb-2">Hey there! I'm K'ah 👋</h2>
                    <p className="text-muted-foreground max-w-md mb-6">
                      I'm your AI marketing guide, here to help you understand marketing 
                      and get the most out of Matango.ai. Ask me anything!
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {quickPrompts.map((prompt, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setMessage(prompt)}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Select value={contextType} onValueChange={setContextType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contextOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ask K'ah anything..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sendMessage.isPending || !message.trim()}
                  >
                    {sendMessage.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Context Help */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Context Modes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contextOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setContextType(opt.value)}
                    className={cn(
                      "w-full p-2 rounded-lg text-left transition-colors",
                      contextType === opt.value
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                    <span>Select a context mode for more relevant answers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                    <span>Be specific about your goals and audience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                    <span>Ask follow-up questions for deeper insights</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
