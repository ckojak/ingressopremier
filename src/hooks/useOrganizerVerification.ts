import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface OrganizerVerification {
  id: string;
  user_id: string;
  document_type: string;
  document_number: string | null;
  document_path: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  created_at: string;
}

export const useOrganizerVerification = () => {
  const [verification, setVerification] = useState<OrganizerVerification | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setVerification(null);
        return;
      }
      const { data } = await supabase
        .from("organizer_verifications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setVerification((data as OrganizerVerification) || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    verification,
    loading,
    refetch,
    isVerified: verification?.status === "verified",
    hasSubmitted: !!verification,
  };
};