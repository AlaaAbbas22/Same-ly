"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import SurahVerseSelector from "@/components/SurahVerseSelector";

export default function UpdateAssignment({ assignment, teamId, onAssignmentUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start: {
      surah: assignment.start?.surah || 1,
      verse: assignment.start?.verse || 1,
    },
    end: {
      surah: assignment.end?.surah || 1,
      verse: assignment.end?.verse || 1,
    },
    status: assignment.status || "pending",
    notes: assignment.notes || "",
    startTime: assignment.startTime ? new Date(assignment.startTime).toISOString().slice(0, 16) : "",
    endTime: assignment.endTime ? new Date(assignment.endTime).toISOString().slice(0, 16) : "",
    type: assignment.type || "Memorization",
  });
  const [dateError, setDateError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
      
      // Validate dates when either startTime or endTime changes
      if (name === "startTime" || name === "endTime") {
        validateDates(name === "startTime" ? value : formData.startTime, 
                     name === "endTime" ? value : formData.endTime);
      }
    }
  };

  const validateDates = (start, end) => {
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (endDate <= startDate) {
        setDateError("End time must be after start time");
      } else {
        setDateError("");
      }
    }
  };

  const handleStatusChange = (value) => {
    setFormData({
      ...formData,
      status: value,
    });
  };

  const handleTypeChange = (value) => {
    setFormData({
      ...formData,
      type: value,
    });
  };

  const handleSurahVerseChange = (type, value) => {
    setFormData({
      ...formData,
      [type]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates before submission
    validateDates(formData.startTime, formData.endTime);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    
    setLoading(true);

    try {
      const payload = {
        assignmentId: assignment._id,
        assignedTo: assignment.assignedTo,
        start: {
          surah: formData.start.surah,
          verse: parseInt(formData.start.verse),
        },
        end: {
          surah: formData.end.surah,
          verse: parseInt(formData.end.verse),
        },
        ta: assignment.ta?._id || null,
        status: formData.status,
        notes: formData.notes,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type,
      };

      const res = await fetch(`/api/teams/${teamId}/assignments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update assignment");
      }

      toast.success("Assignment updated successfully");
      onAssignmentUpdated();
      setOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Update Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Assignment Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Assignment Type
            </label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Memorization">Memorization</SelectItem>
                <SelectItem value="Recitation">Recitation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SurahVerseSelector 
              type="start" 
              value={formData.start} 
              onChange={(value) => handleSurahVerseChange("start", value)}
              required
            />
            <SurahVerseSelector 
              type="end" 
              value={formData.end} 
              onChange={(value) => handleSurahVerseChange("end", value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="graded">Graded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="text-sm font-medium">
                Start Time
              </label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="text-sm font-medium">
                End Time
              </label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          {dateError && <p className="text-red-500 text-sm">{dateError}</p>}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add notes about the assignment"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || dateError}>
              {loading ? "Saving..." : "Update Assignment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}