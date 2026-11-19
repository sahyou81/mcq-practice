import { defineEveryApp } from "@every-app/sdk";

export default defineEveryApp({
  id: "mcq-practice",
  name: "MCQ Practice",
  description:
    "A shared bank of multiple-choice questions to practise by course, revise with spaced repetition and sit timed exams.",
  icon: "/icon.svg",
  resources: {
    d1: ["DB"],
  },
});
