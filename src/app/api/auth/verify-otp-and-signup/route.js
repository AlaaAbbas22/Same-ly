import { connectToDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find user in otps collection
    const otpUser = await db.collection("otps").findOne({ email });

    if (!otpUser) {
      return NextResponse.json({ message: "User not found or already verified" }, { status: 404 });
    }

    if (otpUser.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    if (new Date() > new Date(otpUser.otpExpires)) {
      // Optionally, delete expired OTP entry
      await db.collection("otps").deleteOne({ email });
      return NextResponse.json({ message: "OTP expired. Please sign up again." }, { status: 400 });
    }

    // OTP is valid, move user to users collection
    const { name, password, birthDate, createdAt } = otpUser;
    await db.collection("users").insertOne({
      name,
      email,
      password,
      birthDate,
      createdAt,
      isVerified: true, // Mark as verified
    });

    // Delete from otps collection
    await db.collection("otps").deleteOne({ email });

    return NextResponse.json(
      { message: "Account verified and registered successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}