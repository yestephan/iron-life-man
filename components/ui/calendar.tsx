'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, UI, type ClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        [UI.Root]: 'relative',
        [UI.Months]: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        [UI.Month]: 'space-y-4',
        [UI.MonthCaption]: 'flex justify-center pt-1 relative items-center',
        [UI.CaptionLabel]: 'text-sm font-medium',
        [UI.Nav]: 'space-x-1 flex items-center',
        [UI.NavButton]: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        [UI.NavButtonPrevious]: 'absolute left-1',
        [UI.NavButtonNext]: 'absolute right-1',
        [UI.MonthGrid]: 'w-full border-collapse space-y-1',
        [UI.Weekdays]: 'flex',
        [UI.Weekday]: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        [UI.Week]: 'flex w-full mt-2',
        [UI.Day]:
          'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        [UI.DayButton]: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        [UI.DayRangeEnd]: 'day-range-end',
        [UI.DaySelected]:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        [UI.DayToday]: 'bg-accent text-accent-foreground',
        [UI.DayOutside]:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        [UI.DayDisabled]: 'text-muted-foreground opacity-50',
        [UI.DayRangeMiddle]: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        [UI.DayHidden]: 'invisible',
        ...classNames,
      } as ClassNames}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" {...props} />;
          }
          return <ChevronRight className="h-4 w-4" {...props} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
