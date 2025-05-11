'use client';

import React, { useState, useEffect, memo } from 'react'; // Import memo
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
// Import all potentially used Lucide icons
import * as LucideIcons from 'lucide-react';

// Define type alias for icon names
type IconName = keyof typeof LucideIcons;

// Interface now uses iconName: string
export interface ActivityItem {
  id: string;
  iconName: IconName | string;
  text: string;
  time: string;
  timestamp?: number; // Add the timestamp property that's being used for sorting
}

interface RecentActivityListProps {
  activities: ActivityItem[];
}

// Memoized component for rendering a single activity item
const ActivityListItem = memo(({ activity, isLast }: { activity: ActivityItem, isLast: boolean }) => {
  const renderIcon = (iconName: ActivityItem['iconName']) => {
    const IconComponent = LucideIcons[iconName as IconName] as LucideIcons.LucideIcon;
    if (!IconComponent) {
      return <LucideIcons.HelpCircle className="w-5 h-5 text-muted-foreground" />;
    }
    return <IconComponent className="w-5 h-5 text-primary" />;
  };

  return (
    <React.Fragment>
      <div className="flex items-center gap-4 py-2">
        <div className="p-2 bg-primary/10 rounded-full">
          {renderIcon(activity.iconName)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{activity.text}</p>
          <p className="text-xs text-muted-foreground">{activity.time}</p>
        </div>
      </div>
      {!isLast && <Separator className="bg-border/50"/>}
    </React.Fragment>
  );
});
ActivityListItem.displayName = 'ActivityListItem'; // Add display name

export function RecentActivityList({ activities }: RecentActivityListProps) {
   const [isClient, setIsClient] = useState(false);

   useEffect(() => {
     setIsClient(true);
   }, []);

  if (!isClient) {
    // Render skeleton or placeholder during SSR/hydration
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No recent activity.</p>;
  }

  return (
    // Max height and scrollbar for longer lists
    <ScrollArea className="h-[200px] pr-4">
      <div className="space-y-4">
        {activities.map((activity, index) => (
          // Use the memoized ActivityListItem component
          <ActivityListItem
            key={activity.id}
            activity={activity}
            isLast={index === activities.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
