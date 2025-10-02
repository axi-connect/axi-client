"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()
  useEffect(() => {
    // Si se navega directo a /auth/logout sin interceptación, redirigimos a la modal
    router.replace("/auth/logout")
  }, [router])
  return null
}