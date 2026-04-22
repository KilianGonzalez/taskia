import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getFixedCommitments } from "@/app/actions"
import {
  FixedCommitmentsClient,
  type Commitment,
} from "@/components/commitments/FixedCommitmentsClient"

export default async function CommitmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const commitments = await getFixedCommitments()

  return (
    <FixedCommitmentsClient
      initialCommitments={commitments as Commitment[]}
    />
  )
}
