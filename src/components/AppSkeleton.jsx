import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CalendarDays, ListTodo, MapPin, Calendar, Plane, BarChart2, Menu } from 'lucide-react';

const AppSkeleton = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-background flex flex-col font-sans text-foreground overflow-hidden"
    >
      
      {/* ─── STICKY TOP HEADER SKELETON ─── */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-[0_1px_0_0_hsl(var(--border)),0_4px_24px_-4px_hsl(var(--foreground)/0.06)] pt-safe">
        
        {/* Mobile Header Skeleton */}
        <header className="md:hidden flex flex-col bg-background/95 backdrop-blur-md border-b border-border/80">
          <div className="flex px-4 py-3 justify-between items-center">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl skeleton-shimmer flex-shrink-0" />
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-2.5 rounded skeleton-shimmer" />
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <div className="w-14 h-2.5 rounded skeleton-shimmer" />
                </div>
                <div className="w-28 h-4 rounded-md skeleton-shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
              <div className="w-16 h-7 rounded-2xl skeleton-shimmer" />
            </div>
          </div>

          {/* Mobile Quick Balance Pills */}
          <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5 overflow-x-auto hide-scrollbar">
            {[1, 2, 3, 4].map((p) => (
              <div key={p} className="h-7 w-20 rounded-xl skeleton-shimmer flex-shrink-0 opacity-80" />
            ))}
          </div>
        </header>

        {/* Desktop Top Bar Skeleton */}
        <header className="hidden md:flex px-6 py-2.5 justify-between items-center gap-6">
          {/* Left Branding */}
          <div className="flex items-center gap-3.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-2.5 rounded skeleton-shimmer" />
                <span className="text-[10px] text-muted-foreground/40">•</span>
                <div className="w-16 h-2.5 rounded skeleton-shimmer" />
              </div>
              <div className="w-36 h-4 rounded-md skeleton-shimmer" />
            </div>
          </div>

          {/* Leave Balances Shimmer */}
          <div className="hidden lg:flex items-center gap-5 overflow-x-auto hide-scrollbar flex-1 min-w-0 justify-end">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col w-28 flex-shrink-0 gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-2.5 rounded skeleton-shimmer" />
                  <div className="w-10 h-3 rounded skeleton-shimmer" />
                </div>
                <div className="flex items-baseline gap-1">
                  <div className="w-12 h-5 rounded skeleton-shimmer" />
                </div>
                <div className="h-1 w-full rounded-full skeleton-shimmer" />
                <div className="w-20 h-2 rounded skeleton-shimmer" />
              </div>
            ))}
            {/* WFH Monthly Quota Shimmer */}
            <div className="flex flex-col w-28 border-l border-border/60 pl-5 flex-shrink-0 gap-1.5">
              <div className="flex justify-between items-center">
                <div className="w-8 h-2.5 rounded skeleton-shimmer" />
                <div className="w-12 h-3 rounded skeleton-shimmer" />
              </div>
              <div className="w-10 h-5 rounded skeleton-shimmer" />
              <div className="h-1 w-full rounded-full skeleton-shimmer" />
              <div className="w-16 h-2 rounded skeleton-shimmer" />
            </div>
          </div>

          {/* Profile & Theme Skeleton */}
          <div className="flex items-center gap-3 border-l border-border/80 pl-4 flex-shrink-0">
            <div className="w-24 h-8 rounded-full skeleton-shimmer" />
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
          </div>
        </header>

        {/* Desktop Tabs Skeleton */}
        <div className="hidden md:block px-6">
          <div className="flex justify-between items-center border-b border-border/40">
            <div className="flex gap-6 items-center">
              <div className="py-2.5 flex items-center gap-2 border-b-2 border-foreground">
                <CalendarDays size={15} className="text-muted-foreground/50" />
                <div className="w-16 h-4 rounded skeleton-shimmer" />
              </div>
              <div className="py-2.5 flex items-center gap-2 border-b-2 border-transparent">
                <ListTodo size={15} className="text-muted-foreground/30" />
                <div className="w-20 h-4 rounded skeleton-shimmer opacity-60" />
                <div className="w-5 h-4 rounded-full skeleton-shimmer opacity-40" />
              </div>
            </div>
            <div className="py-2.5 flex items-center gap-2 opacity-40">
              <MapPin size={15} className="text-muted-foreground/30" />
              <div className="w-16 h-3.5 rounded skeleton-shimmer" />
              <div className="w-14 h-3.5 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY SKELETON ─── */}
      <div className="flex-1 p-0 md:p-6 flex flex-col md:flex-row gap-0 md:gap-6 overflow-hidden relative md:pb-0">
        
        {/* Left Optimizer Sidebar Skeleton (Desktop Only) */}
        <div className="hidden md:flex w-80 flex-shrink-0 flex-col bg-card rounded-2xl border border-border shadow-apple-sm overflow-hidden h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
              <div className="flex flex-col gap-1">
                <div className="w-24 h-3.5 rounded skeleton-shimmer" />
                <div className="w-16 h-2.5 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="w-12 h-5 rounded-full skeleton-shimmer" />
          </div>

          {/* AI Optimizer Card Placeholders */}
          <div className="p-4 flex flex-col gap-3.5 overflow-y-auto flex-1">
            <div className="p-3 bg-muted/40 border border-border/50 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-20 h-3.5 rounded skeleton-shimmer" />
                <div className="w-14 h-4 rounded-md skeleton-shimmer" />
              </div>
              <div className="w-full h-3 rounded skeleton-shimmer opacity-70" />
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <div className="w-16 h-3 rounded skeleton-shimmer" />
                <div className="w-20 h-6 rounded-lg skeleton-shimmer" />
              </div>
            </div>

            <div className="p-3 bg-muted/40 border border-border/50 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-28 h-3.5 rounded skeleton-shimmer" />
                <div className="w-14 h-4 rounded-md skeleton-shimmer" />
              </div>
              <div className="w-4/5 h-3 rounded skeleton-shimmer opacity-70" />
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <div className="w-20 h-3 rounded skeleton-shimmer" />
                <div className="w-20 h-6 rounded-lg skeleton-shimmer" />
              </div>
            </div>

            <div className="p-3 bg-muted/40 border border-border/50 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-24 h-3.5 rounded skeleton-shimmer" />
                <div className="w-12 h-4 rounded-md skeleton-shimmer" />
              </div>
              <div className="w-3/4 h-3 rounded skeleton-shimmer opacity-70" />
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <div className="w-16 h-3 rounded skeleton-shimmer" />
                <div className="w-20 h-6 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Calendar Grid Skeleton */}
        <div className="flex-1 flex flex-col bg-background md:bg-card md:rounded-2xl md:border border-border md:shadow-apple-sm overflow-hidden h-full">
          
          {/* Legend Bar (Desktop) */}
          <div className="hidden md:flex p-4 border-b border-border gap-6 items-center bg-muted/30">
            <div className="w-12 h-3 rounded skeleton-shimmer" />
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full skeleton-shimmer" /><div className="w-14 h-3 rounded skeleton-shimmer" /></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full skeleton-shimmer" /><div className="w-12 h-3 rounded skeleton-shimmer" /></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full skeleton-shimmer" /><div className="w-20 h-3 rounded skeleton-shimmer" /></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full skeleton-shimmer" /><div className="w-24 h-3 rounded skeleton-shimmer" /></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full skeleton-shimmer" /><div className="w-16 h-3 rounded skeleton-shimmer" /></div>
          </div>

          {/* Calendar Canvas Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6 flex flex-col gap-6">
            
            {/* Calendar Controls & Month Switcher Skeleton */}
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                <div className="w-32 md:w-36 h-6 rounded-md skeleton-shimmer" />
                <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
                <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
              </div>
            </div>

            {/* Mobile Single Month View vs Desktop Grid */}
            <div className="block md:hidden">
              {/* Single Focused Month Card for Mobile */}
              <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <div className="w-28 h-5 rounded-md skeleton-shimmer" />
                  <div className="w-12 h-3 rounded skeleton-shimmer opacity-60" />
                </div>
                
                {/* 7-column weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                    <div key={dIdx} className="h-4 flex items-center justify-center">
                      <div className="w-3 h-2.5 rounded skeleton-shimmer opacity-40" />
                    </div>
                  ))}
                </div>

                {/* Day cells grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 35 }).map((_, cellIdx) => (
                    <div 
                      key={cellIdx} 
                      className={`h-11 rounded-xl border border-border/30 flex items-center justify-center ${
                        cellIdx % 7 >= 5 ? 'bg-muted/40' : 'bg-card/70'
                      }`}
                    >
                      <div className="w-4 h-3.5 rounded skeleton-shimmer opacity-50" />
                    </div>
                  ))}
                </div>

                {/* Month Holiday Placeholders */}
                <div className="pt-3 border-t border-border/40 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full skeleton-shimmer" />
                    <div className="w-28 h-3 rounded skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Multiple Months Grid */}
            <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((monthIndex) => (
                <div key={monthIndex} className="p-4 bg-muted/20 border border-border/60 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <div className="w-24 h-4 rounded-md skeleton-shimmer" />
                    <div className="w-12 h-3 rounded skeleton-shimmer opacity-60" />
                  </div>
                  
                  {/* 7-column weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                      <div key={dIdx} className="h-4 flex items-center justify-center">
                        <div className="w-3 h-2 rounded skeleton-shimmer opacity-40" />
                      </div>
                    ))}
                  </div>

                  {/* Day cells grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, cellIdx) => (
                      <div 
                        key={cellIdx} 
                        className={`h-9 rounded-xl border border-border/30 flex items-center justify-center ${
                          cellIdx % 7 >= 5 ? 'bg-muted/40' : 'bg-card/70'
                        }`}
                      >
                        <div className="w-3 h-3 rounded skeleton-shimmer opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* ─── MOBILE BOTTOM NAVIGATION BAR SKELETON ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border">
        {/* Mobile mini usage line */}
        <div className="h-1 w-full bg-muted/60 skeleton-shimmer" />
        <div className="px-4 py-2 flex justify-around items-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-6 rounded-xl skeleton-shimmer opacity-80" />
            <div className="w-10 h-2 rounded skeleton-shimmer opacity-50" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-6 rounded-xl skeleton-shimmer opacity-40" />
            <div className="w-10 h-2 rounded skeleton-shimmer opacity-30" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-6 rounded-xl skeleton-shimmer opacity-40" />
            <div className="w-10 h-2 rounded skeleton-shimmer opacity-30" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-6 rounded-xl skeleton-shimmer opacity-40" />
            <div className="w-10 h-2 rounded skeleton-shimmer opacity-30" />
          </div>
        </div>
      </div>

    </motion.div>
  );
};

export default AppSkeleton;
