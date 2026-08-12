import { supabase } from "@/integrations/supabase/client";

/**
 * Safe wrapper for Supabase queries that handles errors silently
 * and returns default values on failure
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  defaultValue: T
): Promise<T> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.warn("Supabase query warning:", error.message);
      return defaultValue;
    }
    return data ?? defaultValue;
  } catch (err) {
    console.warn("Supabase query exception:", err);
    return defaultValue;
  }
}

/**
 * Check if the database tables exist and are accessible
 */
export async function checkDatabaseHealth(): Promise<{
  profilesOk: boolean;
  userRolesOk: boolean;
  eventsOk: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check profiles table
  let profilesOk = false;
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    profilesOk = !error;
    if (error) errors.push(`Profiles: ${error.message}`);
  } catch (e: any) {
    errors.push(`Profiles: ${e.message}`);
  }

  // Check user_roles table
  let userRolesOk = false;
  try {
    const { error } = await supabase.from("user_roles").select("id").limit(1);
    userRolesOk = !error;
    if (error) errors.push(`User Roles: ${error.message}`);
  } catch (e: any) {
    errors.push(`User Roles: ${e.message}`);
  }

  // Check events table
  let eventsOk = false;
  try {
    const { error } = await supabase.from("events").select("id").limit(1);
    eventsOk = !error;
    if (error) errors.push(`Events: ${error.message}`);
  } catch (e: any) {
    errors.push(`Events: ${e.message}`);
  }

  return { profilesOk, userRolesOk, eventsOk, errors };
}

/**
 * Ensure user has a role, creating default if missing
 */
export async function ensureUserRole(
  userId: string, 
  email: string, 
  adminEmails: string[] = []
): Promise<string | null> {
  try {
    // Check existing roles
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.warn("Error fetching user roles:", rolesError.message);
      return null;
    }

    const roleList = rolesData?.map(r => r.role) || [];

    // Prioritize roles: admin > organizer > user
    if (roleList.includes("admin")) return "admin";
    if (roleList.includes("organizer")) return "organizer";
    if (roleList.length > 0) return roleList[0];

    // No role exists, create one
    const isAdminEmail = adminEmails.map(e => e.toLowerCase()).includes(email.toLowerCase());
    const newRole = isAdminEmail ? "admin" : "user";

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert([{ user_id: userId, role: newRole as any }]);

    if (insertError) {
      console.warn("Error creating user role:", insertError.message);
      return null;
    }

    return newRole;
  } catch (err) {
    console.warn("Error in ensureUserRole:", err);
    return null;
  }
}
