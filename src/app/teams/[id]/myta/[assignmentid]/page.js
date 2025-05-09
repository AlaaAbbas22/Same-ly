"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LoginButton from "@/components/LoginButton";
import GradeAssignment from "@/components/GradeAssignment";
import UpdateAssignment from "@/components/UpdateAssignment";
import DeleteAssignment from "@/components/DeleteAssignment";

export default function TAAssignmentDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [surahNames, setSurahNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) {
      fetchAssignment();
      fetchSurahs();
    }
  }, [session, params.id, params.assignmentid]);

  const fetchAssignment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${params.id}/ta`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch TA assignments");
      }
      const data = await res.json();
      const foundAssignment = data.find(a => a._id === params.assignmentid);
      
      if (!foundAssignment) {
        throw new Error("Assignment not found");
      }
      
      setAssignment(foundAssignment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      console.error("Error fetching surahs:", err);
    }
  };

  const getSurahName = (surahNumber) => {
    surahNumber = parseInt(surahNumber)-1;
    if (!surahNames[surahNumber]) {
      return surahNumber+1;
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

  const handleAssignmentUpdated = () => {
    fetchAssignment();
  };

  const handleAssignmentDeleted = () => {
    router.push(`/teams/${params.id}/myta`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginButton />
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push(`/teams/${params.id}/myta`)} className="mr-4">
          Back to My TA Assignments
        </Button>
        <h1 className="text-2xl font-bold">Assignment Details</h1>
      </div>
      
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      {assignment ? (
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Assignment Content</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg mb-2">
                    From Surah {getSurahName(assignment.start.surah)}: {assignment.start.verse}
                  </p>
                  <p className="text-lg">
                    To Surah {getSurahName(assignment.end.surah)}: {assignment.end.verse}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Assignment Type</h3>
                  <span className={getTypeBadge(assignment.type || "Memorization")}>
                    {assignment.type || "Memorization"}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2">Status</h3>
                  <span className={getStatusBadge(assignment.status)}>
                    {assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1)}
                  </span>
                </div>
                
                {assignment.grade !== undefined && assignment.grade !== null && (
                  <div>
                    <h3 className="text-md font-medium mb-2">Grade</h3>
                    <p className="text-lg font-semibold">{assignment.grade}/100</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-md font-medium mb-2">Timeline</h3>
                  <p>
                    <span className="font-medium">Start:</span>{" "}
                    {assignment.startTime ? new Date(assignment.startTime).toLocaleString() : "-"}
                  </p>
                  <p>
                    <span className="font-medium">End:</span>{" "}
                    {assignment.endTime ? new Date(assignment.endTime).toLocaleString() : "-"}
                  </p>
                </div>
              </div>
              
              {assignment.student && (
                <div>
                  <h3 className="text-md font-medium mb-2">Student</h3>
                  <p>
                    <a href={`mailto:${assignment.student.email}`} className="text-blue-600 hover:underline">
                      {assignment.student.name}
                    </a>
                  </p>
                </div>
              )}
              
              {assignment.notes && (
                <div>
                  <h3 className="text-md font-medium mb-2">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {assignment.notes}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4 border-t">
                <GradeAssignment 
                  assignment={assignment} 
                  teamId={params.id} 
                  onGradeUpdated={handleAssignmentUpdated} 
                />
                <UpdateAssignment 
                  assignment={assignment} 
                  teamId={params.id} 
                  onAssignmentUpdated={handleAssignmentUpdated} 
                />
                <DeleteAssignment
                  assignment={assignment}
                  teamId={params.id}
                  onAssignmentDeleted={handleAssignmentDeleted}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-8 border rounded-lg">
          <h3 className="text-lg font-medium">Assignment not found</h3>
        </div>
      )}
    </div>
  );
}