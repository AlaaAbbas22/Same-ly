import Link from 'next/link'
import React from 'react'
import { Button } from './ui/button'

function LoginButton() {
  return (
    <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please sign in to view your dashboard</h1>
        <Link href="/login" passHref>
          <Button>Sign In</Button>
        </Link>
    </div>
  )
}

export default LoginButton