import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "Search query must be at least 2 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Search in user's conversations and messages
    const results = await prisma.message.findMany({
      where: {
        conversation: {
          userId: session.user.id,
        },
        content: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit results
    });

    // Group results by conversation
    const groupedResults = results.reduce((acc, message) => {
      const convId = message.conversation.id;
      if (!acc[convId]) {
        acc[convId] = {
          conversationId: convId,
          conversationTitle: message.conversation.title,
          conversationCreatedAt: message.conversation.createdAt,
          messages: [],
        };
      }
      acc[convId].messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      });
      return acc;
    }, {} as Record<string, any>);

    return new Response(
      JSON.stringify({
        query,
        results: Object.values(groupedResults),
        totalMessages: results.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error searching messages:", error);
    return new Response(
      JSON.stringify({ error: "Failed to search messages" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
