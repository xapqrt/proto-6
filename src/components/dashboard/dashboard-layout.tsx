'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Card } from '@/components/ui/card';

export interface DashboardWidgetConfig {
  id: string;
  component: React.ComponentType<any>;
  title: string;
  defaultProps?: Record<string, any>;
  colSpan?: number;
  rowSpan?: number;
}

interface DashboardLayoutProps {
  initialWidgets: DashboardWidgetConfig[];
  storageKey?: string; // Make storageKey optional as we remove localStorage use for now
  className?: string;
}

// Removed localStorage keys
// const WIDGET_ORDER_KEY_PREFIX = 'dashboardWidgetOrder_';

export function DashboardLayout({ initialWidgets, storageKey, className }: DashboardLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(initialWidgets); // Initialize with initialWidgets
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => initialWidgets.map(w => w.id)); // Initialize order from initialWidgets

  useEffect(() => {
    setIsClient(true);
    // No loading from localStorage anymore
    // Reset widgets based on initial props if they change (though usually they shouldn't)
    setWidgetOrder(initialWidgets.map(w => w.id));
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  // Remove useEffect for saving to localStorage

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Update the widgets state based on the new order for rendering
        setWidgets(newOrder.map(id => initialWidgets.find(w => w.id === id)).filter(Boolean) as DashboardWidgetConfig[]);
        // TODO: If persistence is needed, call a server action here to save `newOrder` to the database
        console.warn("Dashboard layout order persistence needs DB implementation.");
        return newOrder;
      });
    }
  }, [initialWidgets]); // Keep initialWidgets dependency

  if (!isClient) {
    // Render a consistent skeleton based on initialWidgets count
    return <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse ${className}`}>
      {[...Array(initialWidgets.length)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-lg"></div>)}
      </div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        <SortableContext
          items={widgetOrder}
          strategy={rectSortingStrategy}
        >
          {widgets.map(widget => (
            <SortableItem key={widget.id} id={widget.id}>
               <Card className={`glassmorphism hover-glow col-span-1 ${widget.colSpan ? `sm:col-span-${Math.min(widget.colSpan, 2)} lg:col-span-${Math.min(widget.colSpan, 4)}` : ''} ${widget.rowSpan ? `row-span-${widget.rowSpan}` : ''}`}>
                <widget.component {...widget.defaultProps} />
              </Card>
            </SortableItem>
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
