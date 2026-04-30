import { NextRequest } from "next/server";
import { moderateBlogPost } from "../_moderation";

export async function POST(request: NextRequest) {
  return moderateBlogPost(request, "reject");
}

