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

    const { id: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const studentIdsParam = searchParams.get('studentIds'); // Comma-separated string

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate) || isNaN(endDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify team exists and user is part of it
    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const userId = session.user.id || session.user.sub;
    const isTeamMember = team.students.includes(userId) || team.editors.includes(userId);

    if (!isTeamMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all students in the team
    let teamStudents = await db.collection('users').find(
      { _id: { $in: team.students.map(id => new ObjectId(id)) } },
      { projection: { name: 1, email: 1 } }
    ).toArray();

    if (studentIdsParam) {
      const filterStudentIds = studentIdsParam.split(',').map(id => new ObjectId(id.trim()));
      teamStudents = teamStudents.filter(student => filterStudentIds.some(filterId => filterId.equals(student._id)));
    }

    const report = await Promise.all(teamStudents.map(async (student) => {
      const assignments = await db.collection('assignments').aggregate([
        { $match: {
          teamId: new ObjectId(teamId),
          assignedTo: student._id,
          startTime: { $gte: startDate },
          endTime: { $lte: endDate },
        }},
        { $group: {
          _id: null,
          attendedAssignments: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$status', 'completed'] },
                  { $eq: ['$status', 'graded'] }
                ]},
                1, 0
              ]
            }
          },
          absentAssignments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          totalAssignments: { $sum: 1 }
        }}
      ]).toArray();

      const studentReport = assignments.length > 0 ? assignments[0] : {
        attendedAssignments: 0,
        absentAssignments: 0,
        totalAssignments: 0,
      };

      return {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,
        attendedAssignments: studentReport.attendedAssignments,
        absentAssignments: studentReport.absentAssignments,
        totalAssignments: studentReport.totalAssignments,
      };
    }));

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating absence report:', error);
    return NextResponse.json({ error: 'Failed to generate absence report' }, { status: 500 });
  }
}
