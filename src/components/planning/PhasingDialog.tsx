import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";

type TimeframeOption = "whole_project" | "first_half" | "second_half" | "middle" | "start_only" | "end_only" | "custom";
type PhasingProfile = "flat" | "heavy_front" | "heavy_back" | "heavy_middle" | "bookended";

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  whole_project: "Whole Project",
  first_half: "First Half",
  second_half: "Second Half",
  middle: "Middle Section",
  start_only: "Start Only (first quarter)",
  end_only: "End Only (last quarter)",
  custom: "Specific Dates",
};

const PHASING_LABELS: Record<PhasingProfile, string> = {
  flat: "Flat (even distribution)",
  heavy_front: "Heavy Front (30/30/20/20)",
  heavy_back: "Heavy Back (20/20/30/30)",
  heavy_middle: "Heavy Middle (20/30/30/20)",
  bookended: "Bookended (30/20/20/30)",
};

const PHASING_WEIGHTS: Record<PhasingProfile, number[]> = {
  flat: [25, 25, 25, 25],
  heavy_front: [30, 30, 20, 20],
  heavy_back: [20, 20, 30, 30],
  heavy_middle: [20, 30, 30, 20],
  bookended: [30, 20, 20, 30],
};

interface PhasingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  personId: string;
  allocations: { id: string; allocated_hours: number; project_scopes?: { roles?: { name?: string } } }[];
  projectStartDate: string;
  projectEndDate: string;
  totalAllocatedHours: number;
  totalPlannedHours: number;
  onApply: (entries: { allocationId: string; date: string; hours: number }[]) => void;
}

function getWorkingDays(start: Date, end: Date) {
  if (start > end) return [];
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d));
}

function sliceDaysByTimeframe(allDays: Date[], timeframe: TimeframeOption, customStart?: Date, customEnd?: Date): Date[] {
  if (timeframe === "custom" && customStart && customEnd) {
    return allDays.filter((d) => d >= customStart && d <= customEnd);
  }
  const len = allDays.length;
  if (len === 0) return [];
  const q = Math.ceil(len / 4);
  const h = Math.ceil(len / 2);
  switch (timeframe) {
    case "whole_project": return allDays;
    case "first_half": return allDays.slice(0, h);
    case "second_half": return allDays.slice(h);
    case "middle": return allDays.slice(q, len - q);
    case "start_only": return allDays.slice(0, q);
    case "end_only": return allDays.slice(len - q);
    default: return allDays;
  }
}

function distributeHours(days: Date[], totalHours: number, profile: PhasingProfile): Map<string, number> {
  const result = new Map<string, number>();
  if (days.length === 0 || totalHours <= 0) return result;

  const weights = PHASING_WEIGHTS[profile];
  const len = days.length;

  const dayWeights: number[] = days.map((_, i) => {
    const quarterIndex = Math.min(Math.floor((i / len) * 4), 3);
    return weights[quarterIndex];
  });

  const totalWeight = dayWeights.reduce((s, w) => s + w, 0);

  // Calculate each day's hours independently to avoid accumulation drift
  days.forEach((d, i) => {
    const hrs = Math.round(((dayWeights[i] / totalWeight) * totalHours) * 100) / 100;
    if (hrs > 0) {
      result.set(format(d, "yyyy-MM-dd"), hrs);
    }
  });

  return result;
}

export function PhasingDialog({
  open, onOpenChange, personName, allocations,
  projectStartDate, projectEndDate,
  totalAllocatedHours, totalPlannedHours, onApply, onClear,
}: PhasingDialogProps & { onClear: () => void }) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("whole_project");
  const [profile, setProfile] = useState<PhasingProfile>("flat");
  const [selectedAllocId, setSelectedAllocId] = useState(allocations.length === 1 ? allocations[0].id : "");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const allProjectDays = useMemo(
    () => getWorkingDays(parseISO(projectStartDate), parseISO(projectEndDate)),
    [projectStartDate, projectEndDate]
  );

  const selectedAlloc = allocations.find((a) => a.id === selectedAllocId);
  const hoursToDistribute = selectedAlloc ? selectedAlloc.allocated_hours : totalAllocatedHours - totalPlannedHours;
  const remainingHours = Math.max(0, (selectedAlloc?.allocated_hours ?? totalAllocatedHours) - totalPlannedHours);

  const targetDays = useMemo(
    () => sliceDaysByTimeframe(allProjectDays, timeframe, customStart, customEnd),
    [allProjectDays, timeframe, customStart, customEnd]
  );

  const preview = useMemo(
    () => distributeHours(targetDays, remainingHours, profile),
    [targetDays, remainingHours, profile]
  );

  const handleApply = () => {
    if (!selectedAllocId) return;
    const entries = Array.from(preview.entries()).map(([date, hours]) => ({
      allocationId: selectedAllocId,
      date,
      hours,
    }));
    onApply(entries);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Phase Hours — {personName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Allocation selector */}
          {allocations.length > 1 && (
            <div>
              <Label className="text-xs text-muted-foreground">Role / Allocation</Label>
              <Select value={selectedAllocId} onValueChange={setSelectedAllocId}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {allocations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.project_scopes?.roles?.name ?? "Role"} ({a.allocated_hours}h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Remaining to plan: </span>
              <span className="font-semibold">{remainingHours}h</span>
            </div>
            {totalPlannedHours > 0 && (
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onClear}>
                Clear Planned ({totalPlannedHours}h)
              </Button>
            )}
          </div>

          {/* Timeframe */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Timeframe</Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeOption)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {Object.entries(TIMEFRAME_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {timeframe === "custom" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !customStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {customStart ? format(customStart, "dd MMM yyyy") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !customEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {customEnd ? format(customEnd, "dd MMM yyyy") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Phasing profile */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Phasing Profile</Label>
            <RadioGroup value={profile} onValueChange={(v) => setProfile(v as PhasingProfile)} className="space-y-1">
              {Object.entries(PHASING_LABELS).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <RadioGroupItem value={k} id={`profile-${k}`} />
                  <Label htmlFor={`profile-${k}`} className="text-sm font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Preview summary */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Preview</p>
            <p className="text-muted-foreground text-xs">
              {targetDays.length} working days · {remainingHours}h to distribute ·{" "}
              {preview.size} days with hours · {Array.from(preview.values()).reduce((s, h) => s + h, 0).toFixed(1)}h total
            </p>
          </div>

          <Button onClick={handleApply} disabled={!selectedAllocId || remainingHours <= 0 || targetDays.length === 0} className="w-full">
            Apply Phasing ({remainingHours}h across {targetDays.length} days)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
