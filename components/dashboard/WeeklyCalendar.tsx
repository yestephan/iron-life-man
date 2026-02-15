'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Workout } from '@/types/database';
import { format, addDays, startOfWeek } from 'date-fns';

interface WeeklyCalendarProps {
  workouts: Workout[];
  weekStart: Date;
  timezone?: string;
}

interface WorkoutEvent {
  workout: Workout;
  top: number;
  height: number;
  left: number;
  width: number;
}

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00
const TIME_SNAP_INTERVAL = 15; // minutes

const disciplineColors = {
  swim: 'bg-cyan-500/90 border-cyan-600',
  bike: 'bg-green-500/90 border-green-600',
  run: 'bg-red-500/90 border-red-600',
};

// Draggable workout event component
function DraggableWorkoutEvent({ event }: { event: WorkoutEvent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.workout.id,
    data: {
      workout: event.workout,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const activityName = `${event.workout.discipline.charAt(0).toUpperCase() + event.workout.discipline.slice(1)} - ${event.workout.workout_type.charAt(0).toUpperCase() + event.workout.workout_type.slice(1)}`;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top: `${event.top}px`,
        left: `${event.left}%`,
        width: `${event.width}%`,
        height: `${event.height}px`,
        minHeight: '40px',
        ...style,
      }}
      {...listeners}
      {...attributes}
      className={`rounded-md border-2 p-2 text-white text-xs cursor-move transition-all ${
        disciplineColors[event.workout.discipline]
      } ${isDragging ? 'opacity-50 scale-95 z-50' : ''}`}
    >
      <div className="flex items-start gap-1 h-full">
        <Badge
          variant="secondary"
          className="text-xs font-normal shrink-0 bg-white/90 text-gray-900 border-0"
        >
          {activityName}
        </Badge>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-[10px] opacity-90">
            {event.workout.scheduled_time} • {event.workout.duration_minutes}min
          </div>
        </div>
        {event.workout.status === 'completed' && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
        {event.workout.status === 'scheduled' && (
          <Circle className="w-3 h-3 flex-shrink-0 opacity-50" />
        )}
      </div>
    </div>
  );
}

// Droppable time slot component
function DroppableTimeSlot({
  dayIndex,
  hour,
  isToday,
  isOver,
}: {
  dayIndex: number;
  hour: number;
  isToday: boolean;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `drop-${dayIndex}-${hour}`,
    data: {
      dayIndex,
      hour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-b border-border relative ${
        isToday ? 'bg-primary/5' : ''
      } ${isOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
      style={{ height: HOUR_HEIGHT }}
    />
  );
}

export default function WeeklyCalendar({
  workouts,
  weekStart,
  timezone = 'UTC',
}: WeeklyCalendarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  // Calculate week days starting from Sunday
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 0 }); // Sunday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Calculate workout positions
  const workoutEvents = useMemo(() => {
    const events: WorkoutEvent[] = [];
    const dayColumns: { [key: string]: Workout[] } = {};

    // Group workouts by day
    workouts.forEach((workout) => {
      const workoutDate = new Date(workout.scheduled_date);
      const dateStr = format(workoutDate, 'yyyy-MM-dd');
      if (!dayColumns[dateStr]) {
        dayColumns[dateStr] = [];
      }
      dayColumns[dateStr].push(workout);
    });

    // Calculate positions for each workout
    Object.entries(dayColumns).forEach(([dateStr, dayWorkouts]) => {
      const dayIndex = weekDays.findIndex((day) => format(day, 'yyyy-MM-dd') === dateStr);
      if (dayIndex === -1) return;

      // Sort workouts by time
      dayWorkouts.sort((a, b) => {
        const [hoursA, minutesA] = a.scheduled_time.split(':').map(Number);
        const [hoursB, minutesB] = b.scheduled_time.split(':').map(Number);
        return hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
      });

      // Calculate positions, handling overlaps
      dayWorkouts.forEach((workout, index) => {
        const [hours, minutes] = workout.scheduled_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + workout.duration_minutes;

        // Check for overlaps
        let overlapIndex = 0;
        let maxOverlaps = 1;
        for (let i = 0; i < index; i++) {
          const prevWorkout = dayWorkouts[i];
          const [prevHours, prevMinutes] = prevWorkout.scheduled_time.split(':').map(Number);
          const prevStartMinutes = prevHours * 60 + prevMinutes;
          const prevEndMinutes = prevStartMinutes + prevWorkout.duration_minutes;

          if (
            (startMinutes >= prevStartMinutes && startMinutes < prevEndMinutes) ||
            (endMinutes > prevStartMinutes && endMinutes <= prevEndMinutes) ||
            (startMinutes <= prevStartMinutes && endMinutes >= prevEndMinutes)
          ) {
            overlapIndex++;
            maxOverlaps = Math.max(maxOverlaps, overlapIndex + 1);
          }
        }

        // Calculate position - clip to visible hours if needed
        let visibleStartMinutes = Math.max(startMinutes, START_HOUR * 60);
        let visibleEndMinutes = Math.min(endMinutes, END_HOUR * 60);

        // Only add if there's visible portion
        if (visibleStartMinutes < visibleEndMinutes) {
          const top = ((visibleStartMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const height = ((visibleEndMinutes - visibleStartMinutes) / 60) * HOUR_HEIGHT;
          const columnWidth = 100 / 7; // 7 days
          const eventWidth = columnWidth / maxOverlaps;
          const left = dayIndex * columnWidth + overlapIndex * eventWidth;

          events.push({
            workout,
            top,
            height: Math.max(height, 20), // Minimum height
            left,
            width: eventWidth,
          });
        }
      });
    });

    return events;
  }, [workouts, weekDays]);

  // Calculate current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < START_HOUR * 60 || totalMinutes > END_HOUR * 60) {
      return null;
    }

    return ((totalMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }, [currentTime]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      slots.push(hour);
    }
    return slots;
  }, []);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || !active) return;

    const workoutId = active.id as string;
    const workout = workouts.find((w) => w.id === workoutId);

    if (!workout) return;

    // Prevent dragging completed/skipped workouts
    if (workout.status !== 'scheduled') {
      toast({
        title: 'Cannot reschedule',
        description: 'Only scheduled workouts can be rescheduled.',
        variant: 'destructive',
      });
      return;
    }

    // Get drop zone info
    const dropZoneId = over.id as string;
    if (!dropZoneId.startsWith('drop-')) return;

    const [, dayIndexStr, hourStr] = dropZoneId.split('-');
    const dayIndex = parseInt(dayIndexStr, 10);
    const hour = parseInt(hourStr, 10);

    if (isNaN(dayIndex) || isNaN(hour)) return;

    const targetDate = weekDays[dayIndex];
    if (!targetDate) return;

    // Calculate time from drop position
    // Use delta.y to calculate offset within the hour slot
    let offsetMinutes = 0;
    if (delta && delta.y !== undefined) {
      // Calculate minutes offset based on delta.y relative to hour height
      offsetMinutes = Math.round((delta.y / HOUR_HEIGHT) * 60);
      // Clamp to valid range (0-59 minutes)
      offsetMinutes = Math.max(0, Math.min(59, offsetMinutes));
    }

    // Snap to nearest interval
    const totalMinutes = hour * 60 + offsetMinutes;
    const snappedMinutes = Math.round(totalMinutes / TIME_SNAP_INTERVAL) * TIME_SNAP_INTERVAL;
    const finalHours = Math.floor(snappedMinutes / 60);
    const finalMinutes = snappedMinutes % 60;

    // Ensure time is within valid range
    if (finalHours < START_HOUR || finalHours >= END_HOUR) {
      toast({
        title: 'Invalid time',
        description: `Time must be between ${START_HOUR}:00 and ${END_HOUR}:00`,
        variant: 'destructive',
      });
      return;
    }

    const newTime = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
    const newDate = format(targetDate, 'yyyy-MM-dd');

    // Don't reschedule if same date and time
    const currentDateStr = format(new Date(workout.scheduled_date), 'yyyy-MM-dd');
    if (currentDateStr === newDate && workout.scheduled_time === newTime) {
      return;
    }

    setIsRescheduling(workoutId);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: newDate,
          scheduled_time: newTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule workout');
      }

      toast({
        title: 'Success',
        description: 'Workout rescheduled successfully',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule workout',
        variant: 'destructive',
      });
    } finally {
      setIsRescheduling(null);
    }
  };

  const activeWorkout = activeId ? workouts.find((w) => w.id === activeId) : null;
  const activeEvent = activeId ? workoutEvents.find((e) => e.workout.id === activeId) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="relative overflow-x-auto">
            {/* Header with days */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[800px]">
                <div className="p-2 border-r">
                  <div className="text-xs font-medium text-muted-foreground">{timezone}</div>
                </div>
                {weekDays.map((day, index) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isToday = dateStr === todayStr;
                  const dayName = format(day, 'EEE').toUpperCase();
                  const dayNumber = format(day, 'd');

                  return (
                    <div
                      key={index}
                      className={`p-2 border-r last:border-r-0 text-center ${
                        isToday ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {dayName}
                      </div>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          isToday
                            ? 'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto'
                            : ''
                        }`}
                      >
                        {dayNumber}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar grid */}
            <div className="relative min-w-[800px]">
              {/* Time axis and grid */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                {/* Time axis */}
                <div className="border-r">
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-b border-border"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <div className="absolute top-0 left-2 text-xs text-muted-foreground">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      {/* Half-hour marker */}
                      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/50" />
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-r last:border-r-0 ${
                        isToday ? 'bg-primary/5' : ''
                      }`}
                    >
                      {timeSlots.map((hour) => {
                        const dropZoneId = `drop-${dayIndex}-${hour}`;
                        const isOver = overId === dropZoneId;

                        return (
                          <DroppableTimeSlot
                            key={hour}
                            dayIndex={dayIndex}
                            hour={hour}
                            isToday={isToday}
                            isOver={isOver}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Current time indicator */}
              {currentTimePosition !== null && (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-20"
                  style={{ top: currentTimePosition }}
                >
                  <div className="flex items-center">
                    <div className="w-[80px] flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                </div>
              )}

              {/* Workout events */}
              {workoutEvents.map((event) => {
                const isLoading = isRescheduling === event.workout.id;
                const isActive = activeId === event.workout.id;

                // Don't render the active dragging event (it's in the overlay)
                if (isActive) return null;

                return <DraggableWorkoutEvent key={event.workout.id} event={event} />;
              })}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeWorkout && activeEvent ? (
                <div
                  className={`rounded-md border-2 p-2 text-white text-xs ${
                    disciplineColors[activeWorkout.discipline]
                  }`}
                  style={{ width: '200px' }}
                >
                  <div className="flex items-start gap-1">
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal shrink-0 bg-white/90 text-gray-900 border-0"
                    >
                      {`${activeWorkout.discipline.charAt(0).toUpperCase() + activeWorkout.discipline.slice(1)} - ${activeWorkout.workout_type.charAt(0).toUpperCase() + activeWorkout.workout_type.slice(1)}`}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-[10px] opacity-90">
                        {activeWorkout.scheduled_time} • {activeWorkout.duration_minutes}min
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
}
