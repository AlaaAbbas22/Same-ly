"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Settings, ArrowLeft, UserCheck } from "lucide-react";
import AddMemberDialog from '@/components/teams/AddMemberDialog';
import CreateAssignment from '@/components/teams/CreateAssignment';
import Link from 'next/link';
import LoginButton from '@/components/LoginButton';

export default function TeamDetail() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (session) fetchTeamDetails();
  }, [session, params.id]);

  const fetchTeamDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${params.id}`);
      const data = await response.json();
      if (response.ok) {
        setTeam(data);
        setIsEditor(data.editors.some(editor => editor._id === session.user.id));
        setIsStudent(data.students.some(student => student._id === session.user.id));
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAsStudent = async () => {
    try {
      setIsJoining(true);
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: params.id, userId: session.user.id, role: 'student' }),
      });
      if (response.ok) fetchTeamDetails();
    } catch (error) {
      console.error('Error joining team:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleMemberAdded = () => fetchTeamDetails();
  const handleAssignmentCreated = () => fetchTeamDetails();

  const handleRemoveMember = async (userId, role) => {
    try {
      const response = await fetch('/api/teams/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: params.id, userId, role }),
      });
      if (response.ok) fetchTeamDetails();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  if (status === 'loading' || isLoading) return (<div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>);
  if (!session) return (<LoginButton />);
  if (!team) return (<div className="p-8"><h1 className="text-2xl font-bold">Team not found</h1><Button onClick={() => router.push('/dashboard')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button></div>);

  const teamMembers = [...team.editors, ...team.students];

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="mr-4"><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {team.description && (<p className="text-muted-foreground">{team.description}</p>)}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Team Members</h2>
        <div className="flex flex-row flex-wrap gap-2 w-full lg:w-auto">
          {!isEditor && !isStudent ? (
            <Button onClick={handleJoinAsStudent} disabled={isJoining} className="w-auto">
              {isJoining ? (<><span className="animate-spin mr-2">⏳</span>Joining...</>) : (<><UserCheck className="mr-2 h-4 w-4" />Join as Student</>)}
            </Button>
          ) : isEditor && (
            <>
              <Button onClick={() => setIsAddMemberOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Add Member</Button>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4" />Team Settings</Button>
              <Button variant="default" onClick={() => setIsCreateAssignmentOpen(true)}>Add Assignment</Button>
            </>
          )}
          <Link href={`${params.id}/myassignments`}><Button variant="default">My Assignments</Button></Link>
          <Link href={`${params.id}/myta`}><Button variant="default">My Students' Assignments</Button></Link>
        </div>
      </div>

      <Tabs defaultValue="editors" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="editors">Editors</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.editors.map((editor) => (
              <Card key={editor._id}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Avatar>
                    <AvatarImage src={editor.image} alt={editor.name} />
                    <AvatarFallback>{editor.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{editor.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{editor.email}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <Badge>Editor</Badge>
                    {isEditor && editor._id !== session.user.id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveMember(editor._id, 'editor')}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="students">
          {team.students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.students.map((student) => (
                <Card key={student._id}>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar>
                      <AvatarImage src={student.image} alt={student.name} />
                      <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">Student</Badge>
                      {isEditor && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveMember(student._id, 'student')}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <h3 className="text-lg font-medium">No students yet</h3>
              <p className="text-muted-foreground mt-1">Add students to your team</p>
              {isEditor && (
                <Button onClick={() => setIsAddMemberOpen(true)} className="mt-4">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isEditor && (
        <>
          <AddMemberDialog 
            open={isAddMemberOpen} 
            onOpenChange={setIsAddMemberOpen} 
            teamId={params.id} 
            onMemberAdded={handleMemberAdded} 
          />
          <CreateAssignment 
            open={isCreateAssignmentOpen}
            onOpenChange={setIsCreateAssignmentOpen}
            teamId={params.id}
            teamMembers={teamMembers}
            onAssignmentCreated={handleAssignmentCreated}
          />
        </>
      )}
    </div>
  );
}
