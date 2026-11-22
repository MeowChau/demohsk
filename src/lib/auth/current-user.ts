import { getApiUser } from "@/lib/api/server";
import { apiRole } from "@/lib/api/config";
export async function getCurrentStudentId(){const user=await getApiUser();return user&&apiRole(user)==="student"?String(user.id):null;}
export async function getCurrentTeacherId(){const user=await getApiUser();return user&&apiRole(user)==="teacher"?String(user.id):null;}
