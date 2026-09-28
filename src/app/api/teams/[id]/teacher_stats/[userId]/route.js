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

    // Authorization: Only editors of the team can access these stats
    const requestingUserId = session.user.id || session.user.sub;
    const isEditor = team.editors.includes(requestingUserId);

    if (!isEditor) {
      return NextResponse.json({ error: 'Forbidden: Only team editors can view teacher stats' }, { status: 403 });
    }

    // Fetch assignments where this teacher is a TA within this team
    const taAssignments = await db.collection('assignments').find({
      teamId: teamObjectId,
      ta: userObjectId,
    }).toArray();

    // Filter for assignments within taAssignments that were graded by this teacher
    const gradedAssignmentsByTA = taAssignments.filter(assignment =>
      assignment.gradedBy && assignment.gradedBy.equals(userObjectId) && assignment.grade !== undefined && assignment.grade !== null
    );

    let totalScore = 0;
    let totalGrades = 0;
    const scoreDistribution = {}; // e.g., { '90-100': 5, '80-89': 10 }

    gradedAssignmentsByTA.forEach(assignment => {
      const score = assignment.grade;
      totalScore += score;
      totalGrades++;

      const bucket = Math.floor(score / 10) * 10; // e.g., 90-99 -> 90
      const bucketKey = `${bucket}-${bucket + 9}`;
      scoreDistribution[bucketKey] = (scoreDistribution[bucketKey] || 0) + 1;
    });

    const averageScore = totalGrades > 0 ? (totalScore / totalGrades) : 0;

    // Count assignments supervised by this teacher (TA)
    const assignmentsSupervisedCount = taAssignments.length;

    // Group supervised assignments by status
    const assignmentsByStatus = taAssignments.reduce((acc, assignment) => {
      acc[assignment.status] = (acc[assignment.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate assignments per student
    const assignmentsPerStudentMap = taAssignments.reduce((acc, assignment) => {
      const studentId = assignment.assignedTo.toString();
      acc[studentId] = (acc[studentId] || 0) + 1;
      return acc;
    }, {});

    const studentIdsWithAssignments = Object.keys(assignmentsPerStudentMap).map(id => new ObjectId(id));
    const studentsInfo = await db.collection('users').find({
      _id: { $in: studentIdsWithAssignments }
    }).project({ _id: 1, name: 1 }).toArray();

    const assignmentsPerStudent = studentsInfo.map(student => ({
      studentName: student.name,
      count: assignmentsPerStudentMap[student._id.toString()],
    }));

    return NextResponse.json({
      teacherId: targetUserId,
      teacherName: user.name, // Add teacher's name
      teamId,
      stats: {
        averageScore,
        scoreDistribution,
        assignmentsSupervised: {
          count: assignmentsSupervisedCount,
          byStatus: assignmentsByStatus,
        },
        assignmentsPerStudent,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher stats' }, { status: 500 });
  }
}