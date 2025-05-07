"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Users } from "lucide-react";
import Link from 'next/link';
import CreateTeamDialog from '@/components/teams/CreateTeamDialog';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState({ editingTeams: [], studentTeams: [] });
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (session) {
      fetchTeams();
    }
  }, [session]);
  
  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teams');
      const data = await response.json();
      
      if (response.ok) {
        setTeams({
          editingTeams: data.editingTeams || [],
          studentTeams: data.studentTeams || []
        });
      } else {
        console.error('Failed to fetch teams:', data.error);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Please sign in to view your dashboard</h1>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Welcome, {session.user.name}!
        </h1>
        <Button onClick={() => setIsCreateTeamOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
      
      <Tabs defaultValue="editing" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="editing">Teams I Manage</TabsTrigger>
          <TabsTrigger value="student">Teams I'm In</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editing">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : teams.editingTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.editingTeams.map((team) => (
                <Card key={team._id}>
                  <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription>{team.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{team.editors?.length || 1} editors, {team.students?.length || 0} students</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/teams/${team._id}`} passHref>
                      <Button variant="outline" className="w-full">View Team</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <h3 className="text-lg font-medium">No teams yet</h3>
              <p className="text-muted-foreground mt-1">Create a team to get started</p>
              <Button onClick={() => setIsCreateTeamOpen(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="student">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : teams.studentTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.studentTeams.map((team) => (
                <Card key={team._id}>
                  <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription>{team.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{team.editors?.length || 1} editors, {team.students?.length || 0} students</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/teams/${team._id}`} passHref>
                      <Button variant="outline" className="w-full">View Team</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <h3 className="text-lg font-medium">You're not a student in any teams</h3>
              <p className="text-muted-foreground mt-1">Teams you join as a student will appear here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <CreateTeamDialog 
        open={isCreateTeamOpen} 
        onOpenChange={setIsCreateTeamOpen}
        onTeamCreated={fetchTeams}
      />
    </div>
  );
}
