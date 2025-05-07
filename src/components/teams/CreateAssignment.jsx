"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SurahVerseSelector from "@/components/SurahVerseSelector";
import { toast } from "sonner";

export default function CreateAssignment({ open, onOpenChange, teamId, teamMembers, onAssignmentCreated }) {
  const [form, setForm] = useState({
    assignedTo: '',
    start: { surah: '1', verse: 1 },
    end: { surah: '1', verse: 1 },
    ta: '', 
    status: 'pending',
    grade: '',
    notes: '',
    startTime: '',
    endTime: '',
    type: 'Memorization'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  const handleClose = () => {
    onOpenChange(false);
    setError('');
    setDateError('');
    setForm({ 
      assignedTo: '',
      start: { surah: '1', verse: 1 },
      end: { surah: '1', verse: 1 },
      ta: '', 
      status: 'pending',
      grade: '',
      notes: '',
      startTime: '',
      endTime: '',
      type: 'Memorization'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Validate dates when either startTime or endTime changes
    if (name === "startTime" || name === "endTime") {
      validateDates(
        name === "startTime" ? value : form.startTime,
        name === "endTime" ? value : form.endTime
      );
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

  const handleSurahVerseChange = (type, value) => {
    setForm({
      ...form,
      [type]: value,
    });
  };

  const handleTypeChange = (value) => {
    setForm({
      ...form,
      type: value,
    });
  };

  const handleSubmit = async () => {
    // Validate dates before submission
    validateDates(form.startTime, form.endTime);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    
    if (!form.assignedTo) {
      setError('Please select a user to assign');
      return;
    }
    
    if (!form.startTime || !form.endTime) {
      setError('Start and end times are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/teams/${teamId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: form.assignedTo,
          start: { surah: form.start.surah, verse: Number(form.start.verse) },
          end: { surah: form.end.surah, verse: Number(form.end.verse) },
          ta: form.ta || undefined,
          status: form.status,
          grade: form.grade ? Number(form.grade) : undefined,
          notes: form.notes,
          startTime: form.startTime,
          endTime: form.endTime,
          type: form.type
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create assignment');
      }
      handleClose();
      if (onAssignmentCreated) onAssignmentCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assignment</DialogTitle>
          <DialogDescription>Create a new assignment for a student.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label>Assign To</Label>
          <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="border p-2 rounded">
            <option value="">Select user</option>
            {teamMembers.map(user => (
              <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
            ))}
          </select>
          
          <div className="space-y-2">
            <Label htmlFor="type">Assignment Type</Label>
            <Select value={form.type} onValueChange={handleTypeChange}>
              <SelectTrigger id="type">
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
              value={form.start} 
              onChange={(value) => handleSurahVerseChange("start", value)}
              required
            />
            <SurahVerseSelector 
              type="end" 
              value={form.end} 
              onChange={(value) => handleSurahVerseChange("end", value)}
              required
            />
          </div>
          
          <Label>TA (optional)</Label>
          <select name="ta" value={form.ta} onChange={handleChange} className="border p-2 rounded">
            <option value="">None</option>
            {teamMembers.map(user => (
              <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
            ))}
          </select>
          <Textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input name="startTime" type="datetime-local" value={form.startTime} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input name="endTime" type="datetime-local" value={form.endTime} onChange={handleChange} required />
            </div>
          </div>
          
          {dateError && <p className="text-red-500 text-sm">{dateError}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || dateError}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}