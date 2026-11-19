// The app's tools for AI clients, served by the Gateway at /mcp with the
// signed-in member. They call the same queries as the pages.
import { defineTools } from "@every-app/sdk/server";
import { z } from "zod";
import * as bank from "@/server/bank";
import * as progress from "@/server/progress";
import { toViewer } from "@/server/viewer";

export const tools = defineTools({
  list_bank: {
    description:
      "List the question bank: sources, their modules and courses, with question counts.",
    risk: "read",
    input: z.object({}).strict(),
    handler: () => bank.getTree(),
  },
  my_stats: {
    description:
      "The member's own progress: questions answered, success rate, revision due, exam scores.",
    risk: "read",
    input: z.object({}).strict(),
    handler: (_input, { user }) => progress.getStats(toViewer(user), {}),
  },
});
