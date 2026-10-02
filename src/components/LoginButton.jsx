"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { withCallbackUrl } from "@/lib/utils";

function LoginButton() {
  const pathname = usePathname();
  const href = withCallbackUrl("/login", pathname || "/dashboard");

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
      <Link href={href} passHref>
        <Button>Sign In</Button>
      </Link>
    </div>
  );
}

export default LoginButton;
