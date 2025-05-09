"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GradeAssignment from "@/components/GradeAssignment";
import UpdateAssignment from "@/components/UpdateAssignment";
import DeleteAssignment from "@/components/DeleteAssignment";
import Link from "next/link";

export default function AssignmentCard({ 
  assignment, 
  teamId, 
  isTA = false, 
  onGradeUpdated, 
  onAssignmentUpdated,
  onAssignmentDeleted
}) {
  const [surahNames, setSurahNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch("https://quranapi.pages.dev/api/surah.json");
        if (!response.ok) {
          throw new Error("Failed to fetch surahs");
        }
        const data = await response.json();
        
        // Create a map of surah numbers to names for easy lookup
        const surahMap = {};
        data.forEach((surah, index) => {
          surahMap[index] = {
            name: surah.surahName,
            arabicName: surah.surahNameArabic
          };
        });
        setSurahNames(surahMap);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching surahs:", err);
        setLoading(false);
      }
    };

    fetchSurahs();
  }, []);

  const getSurahName = (surahNumber) => {
    surahNumber = parseInt(surahNumber)-1;
    if (loading || !surahNames[surahNumber]) {
      return surahNumber;
    }
    return `${surahNumber+1}. ${surahNames[surahNumber].name} (${surahNames[surahNumber].arabicName})`;
  };

  // Function to get status badge styling based on status
  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch(status) {
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case "in-progress":
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case "graded":
        return `${baseClasses} bg-purple-100 text-purple-800 border border-purple-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  // Function to get type badge styling
  const getTypeBadge = (type) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch(type) {
      case "Memorization":
        return `${baseClasses} bg-indigo-100 text-indigo-800 border border-indigo-200`;
      case "Recitation":
        return `${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  return (
    <Card key={assignment._id}>
      <CardHeader>
        <Link href={isTA 
          ? `/teams/${teamId}/myta/${assignment._id}` 
          : `/teams/${teamId}/myassignments/${assignment._id}`} 
          className="hover:underline">
          <CardTitle>
            {assignment.start && assignment.end
              ? <div >
                  From Surah {getSurahName(assignment.start.surah)}: {assignment.start.verse}
                  <br /><br />
                  To Surah {getSurahName(assignment.end.surah)}: {assignment.end.verse}
                </div>
              : "Assignment"}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center">
          <strong className="mr-2">Type:</strong> 
          <span className={getTypeBadge(assignment.type || "Memorization")}>
            {assignment.type || "Memorization"}
          </span>
        </div>
        <div className="mb-2 flex items-center">
          <strong className="mr-2">Status:</strong> 
          <span className={getStatusBadge(assignment.status)}>
            {assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1)}
          </span>
        </div>
        
        {assignment.grade !== undefined && assignment.grade !== null && (
          <div className="mb-2">
            <strong>Grade:</strong> {assignment.grade}
          </div>
        )}
        {assignment.notes && (
          <div className="mb-2">
            <strong>Notes:</strong> {assignment.notes}
          </div>
        )}
        
        {/* TA-specific content */}
        {isTA && assignment.student && (
          <div className="mb-2">
            <a href={`mailto:${assignment.student.email}`}>
              <strong>Assigned To:</strong>{" "}
              {assignment.assignedTo ? (
                <span>{assignment.student.name || "Unknown Student"}</span>
              ) : (
                "Not assigned"
              )}
            </a>
          </div>
        )}
        
        {/* Student-specific content */}
        {!isTA && assignment.ta && (
          <div className="mb-2">
            <a href={`mailto:${assignment.ta.email}`} className="underline">
              <strong>TA:</strong> {assignment.ta.name}
            </a>
          </div>
        )}
        
        <div className="mb-2">
          <strong>Start Time:</strong>{" "}
          {assignment.startTime ? new Date(assignment.startTime).toLocaleString() : "-"}
        </div>
        <div className={isTA ? "mb-4" : ""}>
          <strong>End Time:</strong>{" "}
          {assignment.endTime ? new Date(assignment.endTime).toLocaleString() : "-"}
        </div>
        
        <div className="mt-2">
          <Link href={isTA 
            ? `/teams/${teamId}/myta/${assignment._id}` 
            : `/teams/${teamId}/myassignments/${assignment._id}`}>
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
        
        {/* TA-specific buttons */}
        {isTA && (
          <div className="flex space-x-2 mt-4">
            <GradeAssignment 
              assignment={assignment} 
              teamId={teamId} 
              onGradeUpdated={onGradeUpdated} 
            />
            <UpdateAssignment 
              assignment={assignment} 
              teamId={teamId} 
              onAssignmentUpdated={onAssignmentUpdated} 
            />
            <DeleteAssignment
              assignment={assignment}
              teamId={teamId}
              onAssignmentDeleted={onAssignmentDeleted}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}