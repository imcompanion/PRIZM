import LogTimeTab from "@/components/time-tracking/LogTimeTab";
import ImportTimeEntriesDialog from "@/components/time-tracking/ImportTimeEntriesDialog";

const TimeTrackingPage = () => {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Log actual hours worked on projects</p>
        </div>
        <ImportTimeEntriesDialog />
      </div>
      <LogTimeTab />
    </div>
  );
};

export default TimeTrackingPage;
