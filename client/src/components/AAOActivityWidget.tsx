import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Sparkles, 
  MessageSquare, 
  BarChart3, 
  Video, 
  Image, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_ICONS: Record<string, any> = {
  content_generation: Sparkles,
  engagement: MessageSquare,
  analytics: BarChart3,
  video_creation: Video,
  image_generation: Image,
  scheduling: Calendar,
  campaign: TrendingUp,
  default: Bot,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  pending: "bg-yellow-500",
  failed: "bg-red-500",
};

interface AAOActivityWidgetProps {
  compact?: boolean;
  maxItems?: number;
}

export default function AAOActivityWidget({ compact = false, maxItems = 10 }: AAOActivityWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading } = trpc.aaoActivity.getRecentActivities.useQuery(
    { limit: maxItems },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = trpc.aaoActivity.getTodayStats.useQuery(
    undefined,
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Fetch current tasks
  const { data: currentTasks } = trpc.aaoActivity.getActiveActivities.useQuery(
    undefined,
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  const getActivityIcon = (type: string) => {
    const Icon = ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;
    return Icon;
  };

  const formatActivityTime = (timestamp: Date | string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            AAO Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary">
                {statsLoading ? "-" : (statsData ? (statsData.contentGenerated + statsData.contentPublished + statsData.videosRendered + statsData.imagesGenerated) : 0)}
              </p>
              <p className="text-xs text-muted-foreground">tasks today</p>
            </div>
            {currentTasks && currentTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {currentTasks.length} active
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AAO Activity Feed
        </CardTitle>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          Live
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-primary">
              {statsLoading ? "-" : (statsData ? (statsData.contentGenerated + statsData.contentPublished + statsData.videosRendered + statsData.imagesGenerated) : 0)}
            </p>
            <p className="text-xs text-muted-foreground">Tasks Today</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-green-500">
              {statsLoading ? "-" : statsData?.contentPublished || 0}
            </p>
            <p className="text-xs text-muted-foreground">Published</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-blue-500">
              {currentTasks?.length || 0}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>

        {/* Current Tasks */}
        {currentTasks && currentTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Currently Running
            </h4>
                {currentTasks.slice(0, 3).map((task: any) => {
                  const Icon = getActivityIcon(task.activityType);
                  return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                >
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatActivityTime(task.startedAt)}
                    </p>
                  </div>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Recent Activity
          </h4>
          <ScrollArea className={isExpanded ? "h-[300px]" : "h-[150px]"}>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !activityData || activityData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">AAOs will start working when you create campaigns</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {activityData.map((activity: any) => {
                  const Icon = getActivityIcon(activity.activityType);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${
                        activity.status === "completed" ? "bg-green-500/20" :
                        activity.status === "failed" ? "bg-red-500/20" :
                        "bg-primary/20"
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          activity.status === "completed" ? "text-green-400" :
                          activity.status === "failed" ? "text-red-400" :
                          "text-primary"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatActivityTime(activity.createdAt)}
                          </span>
                          {activity.status === "completed" && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-500/10 text-green-400 border-green-500/30">
                              <CheckCircle2 className="w-2 h-2 mr-1" />
                              Done
                            </Badge>
                          )}
                          {activity.status === "failed" && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-red-500/10 text-red-400 border-red-500/30">
                              <AlertCircle className="w-2 h-2 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Expand/Collapse */}
        {activityData && activityData.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show Less" : "Show More"}
            <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </Button>
        )}

        {/* AAO Status Summary */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">K'ah Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400 font-medium">Active & Learning</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
