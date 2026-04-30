import { NextRequest } from "next/server";
import { generateBlogResponse } from "../_actions";

export async function POST(request: NextRequest) {
  return generateBlogResponse(request, "weekly");
}

