import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Users, 
  FileText,
  Loader2,
  Settings
} from "lucide-react";
import { getLoginUrl } from "@/const";

const notificationIcons: Record<string, React.ReactNode> = {
  scheduled_post: <Calendar className="w-5 h-5" />,
  milestone: <TrendingUp className="w-5 h-5" />,
  team_invite: <Users className="w-5 h-5" />,
  weekly_report: <FileText className="w-5 h-5" />,
  system: <Bell className="w-5 h-5" />,
};

const notificationColors: Record<string, string> = {
  scheduled_post: "bg-blue-500/20 text-blue-400",
  milestone: "bg-green-500/20 text-green-400",
  team_invite: "bg-purple-500/20 text-purple-400",
  weekly_report: "bg-yellow-500/20 text-yellow-400",
  system: "bg-gray-500/20 text-gray-400",
};

export default function Notifications() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: preferences, refetch: refetchPrefs } = trpc.notifications.getPreferences.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
    },
  });

  const updatePrefsMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferences updated");
      refetchPrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleTogglePref = (key: string, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Bell className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Notifications</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to view your notifications and manage preferences.
          </p>
          <Button asChild className="bg-primary text-primary-foreground">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const readNotifications = notifications?.filter(n => n.isRead) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              Notifications
              {unreadCount && unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on your influencer activities
            </p>
          </div>
          
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-card border border-white/10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-20">
                <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground">
                  You'll receive updates about your influencers here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications?.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markReadMutation.mutate({ id: notification.id })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="unread" className="space-y-4">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-20">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  No unread notifications
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markReadMutation.mutate({ id: notification.id })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose which notifications you want to receive via email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.emailEnabled ?? true}
                    onCheckedChange={(v) => handleTogglePref("emailEnabled", v)}
                  />
                </div>
                
                <div className="border-t border-white/10 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        Scheduled Post Published
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When your scheduled posts are published
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.scheduledPostPublished ?? true}
                      onCheckedChange={(v) => handleTogglePref("scheduledPostPublished", v)}
                      disabled={!preferences?.emailEnabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        Follower Milestones
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When your influencers hit follower milestones (1K, 10K, etc.)
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.followerMilestones ?? true}
                      onCheckedChange={(v) => handleTogglePref("followerMilestones", v)}
                      disabled={!preferences?.emailEnabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-yellow-400" />
                        Weekly Report
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Weekly summary of your influencer performance
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.weeklyReport ?? true}
                      onCheckedChange={(v) => handleTogglePref("weeklyReport", v)}
                      disabled={!preferences?.emailEnabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        Team Invitations
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When you're invited to collaborate on an influencer
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.teamInvitations ?? true}
                      onCheckedChange={(v) => handleTogglePref("teamInvitations", v)}
                      disabled={!preferences?.emailEnabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function NotificationCard({ 
  notification, 
  onMarkRead 
}: { 
  notification: any;
  onMarkRead: () => void;
}) {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card 
      className={`bg-card border-white/10 transition-colors cursor-pointer hover:border-primary/50 ${
        !notification.isRead ? "border-l-4 border-l-primary" : ""
      }`}
      onClick={onMarkRead}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${notificationColors[notification.type] || notificationColors.system}`}>
            {notificationIcons[notification.type] || notificationIcons.system}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                {notification.title}
              </h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(notification.createdAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {notification.message}
            </p>
          </div>
          
          {!notification.isRead && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
