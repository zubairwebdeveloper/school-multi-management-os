"use client";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth);
    router.replace("/login");
    router.refresh();
  }
  return (
    <button onClick={onClick} className={className}>Sign out</button>
  );
}
