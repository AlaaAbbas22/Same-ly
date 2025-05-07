"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AssignmentCard from "@/components/AssignmentCard";

export default function MyAssignmentsPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) fetchAssignments();
  }, [session, params.id]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${params.id}/assignments`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch assignments");
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
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Please sign in to view your assignments</h1>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push(`/teams/${params.id}`)} className="mr-4">
          Back to Team
        </Button>
        <h1 className="text-2xl font-bold">My Assignments</h1>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {assignments.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <h3 className="text-lg font-medium">No assignments found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => (
            <AssignmentCard 
              key={assignment._id}
              assignment={assignment}
              teamId={params.id}
              isTA={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}