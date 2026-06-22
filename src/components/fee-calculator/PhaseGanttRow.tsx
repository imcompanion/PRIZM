import { useRef, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface TimelineColumn {
  label: string;
  tooltip: string;
  startWeek: number; // inclusive
  endWeek: number;   // exclusive
}

interface PhaseGanttRowProps {
  phase: string;
  startWeek: number;
  durationWeeks: number;
  totalWeeks: number;
  columns: TimelineColumn[];
  color: string;
  textColor: string;
  bgLight: string;
  weekDates?: Date[] | null;
  onUpdate: (startWeek: number, durationWeeks: number) => void;
}

export function PhaseGanttRow({
  phase,
  startWeek,
  durationWeeks,
  totalWeeks,
  columns,
  color,
  textColor,
  bgLight,
  weekDates,
  onUpdate,
}: PhaseGanttRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"move" | "left" | "right" | null>(null);
  const dragStart = useRef({ mouseX: 0, origStart: 0, origDuration: 0 });

  const weekToPercent = (w: number) => (w / totalWeeks) * 100;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "left" | "right") => {
      e.preventDefault();
      e.stopPropagation();
      dragStart.current = { mouseX: e.clientX, origStart: startWeek, origDuration: durationWeeks };
      setDragging(type);
    },
    [startWeek, durationWeeks]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const deltaWeeks = Math.round(((e.clientX - dragStart.current.mouseX) / rect.width) * totalWeeks);

      if (dragging === "move") {
        let newStart = dragStart.current.origStart + deltaWeeks;
        newStart = Math.max(0, Math.min(newStart, totalWeeks - dragStart.current.origDuration));
        onUpdate(newStart, dragStart.current.origDuration);
      } else if (dragging === "left") {
        let newStart = dragStart.current.origStart + deltaWeeks;
        const maxStart = dragStart.current.origStart + dragStart.current.origDuration - 1;
        newStart = Math.max(0, Math.min(newStart, maxStart));
        const newDuration = dragStart.current.origDuration - (newStart - dragStart.current.origStart);
        onUpdate(newStart, Math.max(1, newDuration));
      } else if (dragging === "right") {
        let newDuration = dragStart.current.origDuration + deltaWeeks;
        newDuration = Math.max(1, Math.min(newDuration, totalWeeks - dragStart.current.origStart));
        onUpdate(dragStart.current.origStart, newDuration);
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, totalWeeks, onUpdate]);

  const left = weekToPercent(startWeek);
  const width = weekToPercent(durationWeeks);

  const barLabel = (() => {
    if (width < 8) return `${durationWeeks}w`;
    if (weekDates) {
      const startDate = format(weekDates[startWeek], "d MMM");
      const endDate = format(weekDates[Math.min(startWeek + durationWeeks - 1, weekDates.length - 1)], "d MMM");
      return `${startDate} – ${endDate} (${durationWeeks}w)`;
    }
    return `W${startWeek + 1}–${startWeek + durationWeeks} (${durationWeeks}w)`;
  })();

  return (
    <div className={cn("flex items-center gap-3 py-2 px-3 rounded-lg", bgLight)}>
      <div className={cn("w-[180px] shrink-0 text-xs font-semibold truncate", textColor)}>
        {phase}
      </div>
      <div ref={trackRef} className="relative flex-1 h-9 bg-muted/40 rounded-md border border-border">
        {/* Column dividers */}
        {columns.slice(1).map((col, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border/50"
            style={{ left: `${weekToPercent(col.startWeek)}%` }}
          />
        ))}

        {/* Bar */}
        <div
          className={cn(
            color,
            "absolute top-1 bottom-1 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-none select-none",
            dragging === "move" && "opacity-90"
          )}
          style={{ left: `${left}%`, width: `${width}%` }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-l-md"
            onMouseDown={(e) => handleMouseDown(e, "left")}
          />
          <span className="text-white text-[10px] font-medium truncate px-3 pointer-events-none">
            {barLabel}
          </span>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-r-md"
            onMouseDown={(e) => handleMouseDown(e, "right")}
          />
        </div>
      </div>
      <div className="w-12 text-right text-xs font-mono text-muted-foreground shrink-0">
        {durationWeeks}w
      </div>
    </div>
  );
}
