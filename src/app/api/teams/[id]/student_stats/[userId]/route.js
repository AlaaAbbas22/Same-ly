import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from '@/lib/mongodb';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;

    if (!teamId || !targetUserId) {
      return NextResponse.json({ error: 'Team ID and User ID are required' }, { status: 400 });
    }

    let teamObjectId, userObjectId;
    try {
      teamObjectId = new ObjectId(teamId);
      userObjectId = new ObjectId(targetUserId);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify team and user existence
    const team = await db.collection('teams').findOne({ _id: teamObjectId });
    const user = await db.collection('users').findOne({ _id: userObjectId });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Authorization:
    // Editors can view any student's stats.
    // Students can only view their own stats.
    const requestingUserId = session.user.id || session.user.sub;
    const isEditor = team.editors.includes(requestingUserId);
    const isTargetUser = requestingUserId === targetUserId;

    if (!isEditor && !isTargetUser) {
      return NextResponse.json({ error: 'Forbidden: You can only view your own student stats' }, { status: 403 });
    }

    // Fetch all assignments for this student in this team
    const studentAssignments = await db.collection('assignments').find({
      teamId: teamObjectId,
      assignedTo: userObjectId,
    }).toArray();

    let totalScore = 0;
    let gradedAssignmentsCount = 0;
    const scoreDistribution = {}; // e.g., { '90-100': 5, '80-89': 10 }
    const assignmentsByStatus = { total: studentAssignments.length };

    studentAssignments.forEach(assignment => {
      if (assignment.grade !== undefined) {
        totalScore += assignment.grade;
        gradedAssignmentsCount++;

        const score = assignment.grade;
        const bucket = Math.floor(score / 10) * 10; // e.g., 90-99 -> 90
        const bucketKey = `${bucket}-${bucket + 9}`;
        scoreDistribution[bucketKey] = (scoreDistribution[bucketKey] || 0) + 1;
      }
      assignmentsByStatus[assignment.status] = (assignmentsByStatus[assignment.status] || 0) + 1;
    });

    const averageScore = gradedAssignmentsCount > 0 ? (totalScore / gradedAssignmentsCount) : 0;

    return NextResponse.json({
      studentId: targetUserId,
      teamId,
      stats: {
        averageScore,
        gradedAssignmentsCount,
        scoreDistribution,
        assignmentsByStatus,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching student stats:', error);
    return NextResponse.json({ error: 'Failed to fetch student stats' }, { status: 500 });
  }
}