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
    const userId = session.user.id || session.user.sub;

    const client = await clientPromise;
    const db = client.db();

    const { id: teamId } = await params;
    
    // Get the team
    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId)  });
    
    
    
    let assignments = [];
    if (team && team.editors.includes(userId)) {
      
        // If user is editor, show all assignments for this team 
      assignments = await db.collection('assignments').aggregate([
        {
          $match: {
            teamId: new ObjectId(teamId)
          }
        },
        {
          $lookup: {
            from: 'users',            // users collection
            localField: 'assignedTo',         // field in assignments
            foreignField: '_id',      // field in users
            as: 'studentInfo'              // will be an array
          }
        },
        {
          $unwind: {
            path: '$studentInfo',
            preserveNullAndEmptyArrays: true  // in case ta is missing
          }
        },
        {
          $addFields: {
            student: {
              name: '$studentInfo.name',
              email: '$studentInfo.email'
            }
          }
        },
        {
          $project: {
            studentInfo: 0 // remove the original taInfo array
          }
        }
      ]).toArray();
    } else {
        // If user is not editor, show only their assignments 
        assignments = await db.collection('assignments').aggregate([
            {
              $match: {
                teamId: new ObjectId(teamId),
                ta: new ObjectId(userId)
              }
            },
            {
              $lookup: {
                from: 'users',            // users collection
                localField: 'assignedTo',         // field in assignments
                foreignField: '_id',      // field in users
                as: 'studentInfo'              // will be an array
              }
            },
            {
              $unwind: {
                path: '$studentInfo',
                preserveNullAndEmptyArrays: true  // in case ta is missing
              }
            },
            {
              $addFields: {
                student: {
                  name: '$studentInfo.name',
                  email: '$studentInfo.email'
                }
              }
            },
            {
              $project: {
                studentInfo: 0 // remove the original taInfo array
              }
            }
          ]).toArray();
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching TA assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}