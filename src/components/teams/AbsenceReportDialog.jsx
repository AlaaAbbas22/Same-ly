"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, FileText } from "lucide-react";
import { MultiSelect } from "react-multi-select-component-19";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AbsenceReportDialog({
  teamId,
  teamMembers,
  open,
  onOpenChange,
}) {
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedStudents([]);
      setReportData(null);
    }
  }, [open]);

  const studentOptions = teamMembers.map((member) => ({
    label: member.name,
    value: member._id,
  }));

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      const studentIds = selectedStudents.map((s) => s.value).join(",");
      const queryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (studentIds) {
        queryParams.append("studentIds", studentIds);
      }

      const res = await fetch(
        `/api/teams/${teamId}/absence_report?${queryParams.toString()}`,
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await res.json();
      setReportData(data);
      toast.success("Absence report generated successfully!");
    } catch (error) {
      console.error("Error generating absence report:", error);
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Absence Report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="startDate" className="text-right">
              From Date:
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="endDate" className="text-right">
              To Date:
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="students" className="text-right">
              Select Students:
            </label>
            <div className="col-span-3">
              <MultiSelect
                options={studentOptions}
                value={selectedStudents}
                onChange={setSelectedStudents}
                labelledBy="Select"
                overrideStrings={{
                  selectSomeItems: "Select Students...",
                  allItemsAreSelected: "All Students Selected",
                  search: "Search Students",
                }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>

          {reportData && reportData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Report Results</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Attended Assignments</TableHead>
                    <TableHead>Absent Assignments</TableHead>
                    <TableHead>Total Assignments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((studentReport) => (
                    <TableRow key={studentReport.studentId}>
                      <TableCell>{studentReport.studentName}</TableCell>
                      <TableCell>{studentReport.attendedAssignments}</TableCell>
                      <TableCell>{studentReport.absentAssignments}</TableCell>
                      <TableCell>{studentReport.totalAssignments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {reportData && reportData.length === 0 && (
            <div className="mt-6 text-center text-muted-foreground">
              No absence data found for the selected criteria.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
