"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DAYS_OF_WEEK } from "@/lib/meetingTimes";

const emptySlot = () => ({
  dayOfWeek: 1,
  startTime: "18:30",
  endTime: "20:30",
});

export default function EditTeamSettingsDialog({
  open,
  onOpenChange,
  team,
  onTeamUpdated,
}) {
  const [teamName, setTeamName] = useState(team?.name || "");
  const [meetingTimes, setMeetingTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && team) {
      setTeamName(team.name);
      setMeetingTimes(
        Array.isArray(team.meetingTimes) && team.meetingTimes.length > 0
          ? team.meetingTimes.map((slot) => ({
              dayOfWeek: Number(slot.dayOfWeek),
              startTime: slot.startTime,
              endTime: slot.endTime,
            }))
          : [],
      );
      setError("");
    }
  }, [open, team]);

  const updateSlot = (index, field, value) => {
    setMeetingTimes((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    );
  };

  const addSlot = () => {
    setMeetingTimes((prev) => [...prev, emptySlot()]);
  };

  const removeSlot = (index) => {
    setMeetingTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    for (const slot of meetingTimes) {
      if (slot.endTime <= slot.startTime) {
        setError("Each meeting's end time must be after its start time.");
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/teams/${team._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: teamName,
          meetingTimes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update team settings.");
      }

      onTeamUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Settings</DialogTitle>
          <DialogDescription>
            Update the team name and recurring meeting times used when creating assignments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Meeting Times</Label>
                <p className="text-sm text-muted-foreground">
                  Days and times this team meets in person.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                Add meeting
              </Button>
            </div>

            {meetingTimes.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
                No meeting times set. Add Mondays and Wednesdays (or any days) so assignments can use &quot;Next time&quot;.
              </p>
            )}

            {meetingTimes.map((slot, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end"
              >
                <div className="space-y-1">
                  <Label htmlFor={`day-${index}`} className="text-xs">
                    Day
                  </Label>
                  <select
                    id={`day-${index}`}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={slot.dayOfWeek}
                    onChange={(e) =>
                      updateSlot(index, "dayOfWeek", Number(e.target.value))
                    }
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`start-${index}`} className="text-xs">
                    Start
                  </Label>
                  <Input
                    id={`start-${index}`}
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`end-${index}`} className="text-xs">
                    End
                  </Label>
                  <Input
                    id={`end-${index}`}
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSlot(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
