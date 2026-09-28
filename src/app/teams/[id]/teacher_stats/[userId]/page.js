"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TeacherStatsPage() {
  const params = useParams();
  const router = useRouter();
  const { id: teamId, userId: teacherId } = params;
  const [teacherStats, setTeacherStats] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTeacherStats() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/teams/${teamId}/teacher_stats/${teacherId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch teacher stats");
        }
        setTeacherStats(data.stats);
        setTeacherName(data.teacherName); // Set teacher's name
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (teamId && teacherId) {
      fetchTeacherStats();
    }
  }, [teamId, teacherId]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!teacherStats) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">No Stats Available</h1>
        <p>Could not load teacher statistics.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const scoreDistributionData = Object.keys(teacherStats.scoreDistribution).map(key => ({
    range: key,
    count: teacherStats.scoreDistribution[key],
  })).sort((a, b) => parseInt(a.range.split('-')[0]) - parseInt(b.range.split('-')[0]));

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Teacher Statistics for {teacherName}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Average Score Given</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{teacherStats.averageScore.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments Supervised</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{teacherStats.assignmentsSupervised.count}</p>
            <div className="mt-4">
              {Object.keys(teacherStats.assignmentsSupervised.byStatus).map(status => (
                <p key={status} className="text-sm capitalize">
                  {status}: {teacherStats.assignmentsSupervised.byStatus[status]}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Number of Grades" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Assignments Supervised Per Student</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherStats.assignmentsPerStudent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teacherStats.assignmentsPerStudent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="studentName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="Assignments" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No assignments supervised for any student yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}