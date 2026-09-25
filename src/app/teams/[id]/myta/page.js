"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
import AssignmentCard from "@/components/AssignmentCard";
import LoginButton from "@/components/LoginButton";

export default function MyTAAssignmentsPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTA, setSearchTA] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  useEffect(() => {
    if (session) fetchAssignments();
  }, [session, params.id]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${params.id}/ta`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch TA assignments");
      }
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginButton />;
  }

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/teams/${params.id}`)}
          className="mr-4"
        >
          Back to Team
        </Button>
        <h1 className="text-2xl font-bold">My TA Assignments</h1>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {/* search by TA name or student name */}
      <div className="flex items-center mb-6">
        <Input
          type="text"
          placeholder="Search by TA name or email"
          value={searchTA}
          onChange={(e) => setSearchTA(e.target.value)}
          className="mr-4 bg-white dark:bg-gray-800"
          list="taNameEmailsList"
        />
        <datalist id="taNameEmailsList">
          {assignments
            .filter((assignment) => assignment.taName && assignment.taEmail)
            .map((assignment) => (
              <option
                key={assignment._id}
                value={assignment.taName || assignment.taEmail}
              >
                {assignment.taName} - {assignment.taEmail}
              </option>
            ))}
        </datalist>
        <Input
          type="text"
          placeholder="Search by Student name or email"
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
          className="mr-4 bg-white dark:bg-gray-800"
          list="studentNameEmailsList"
        />
        <datalist id="studentNameEmailsList">
          {assignments.map((assignment) => (
            <option
              key={assignment._id}
              value={assignment.student?.name || assignment.student?.email}
            >
              {assignment.student?.name} - {assignment.student?.email}
            </option>
          ))}
        </datalist>
      </div>
      {assignments.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <h3 className="text-lg font-medium">No TA assignments found</h3>
          <p className="text-muted-foreground mt-2">
            You are not assigned as a TA for any assignments in this team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments
            .filter(
              (assignment) =>
                (assignment.taName || "")
                  .toLowerCase()
                  .includes(searchTA.toLowerCase()) &&
                (assignment.student?.name || "")
                  .toLowerCase()
                  .includes(searchStudent.toLowerCase()),
            )
            .map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                teamId={params.id}
                isTA={true}
                onGradeUpdated={fetchAssignments}
                onAssignmentUpdated={fetchAssignments}
              />
            ))}
        </div>
      )}
    </div>
  );
}
