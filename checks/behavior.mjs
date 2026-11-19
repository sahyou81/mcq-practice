import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import { seed, ids, pickOption, count } from "./seed.mjs";

const runtime = await startRuntime();
try {
  await seed(await runtime.database());
  const health = await runtime.fetch("/health", { role: "member" });
  expect(health.status).toBe(200);

  const owner = await (await runtime.context("owner")).newPage();
  const member = await (await runtime.context("member")).newPage();
  const choice = (page, text) =>
    page.getByTestId("choice").filter({ hasText: text });

  // F001: the bank, built by an admin, browsed by a member.
  await owner.goto("/bank");
  await expect(
    owner
      .getByTestId("source-row")
      .filter({ hasText: "Internal Medicine Past Papers" }),
  ).toContainText("7 questions");
  await owner.getByTestId("new-source").click();
  await owner.getByTestId("source-name").fill("Clinical Pharmacology Handbook");
  await owner.getByTestId("save-source").click();
  await owner
    .getByTestId("source-row")
    .filter({ hasText: "Clinical Pharmacology Handbook" })
    .getByRole("link")
    .click();
  await expect(owner.getByText("No modules yet")).toBeVisible();
  await owner.getByTestId("new-module").click();
  await owner.getByTestId("module-name").fill("Antibiotics");
  await owner.getByTestId("save-module").click();
  const antibiotics = owner
    .getByTestId("module-section")
    .filter({ hasText: "Antibiotics" });
  await expect(antibiotics.getByText("No courses yet")).toBeVisible();
  await antibiotics.getByTestId("new-course").click();
  await owner.getByTestId("course-name").fill("Penicillins");
  await owner.getByTestId("save-course").click();
  await owner
    .getByTestId("course-row")
    .filter({ hasText: "Penicillins" })
    .getByRole("link")
    .click();
  await expect(owner.getByText("No questions yet")).toBeVisible();
  await owner.getByTestId("new-question").click();
  await owner
    .getByTestId("question-stem")
    .fill("Which organism commonly produces penicillinase?");
  await owner.getByTestId("choice-text-0").fill("Staphylococcus aureus");
  await owner.getByTestId("choice-text-1").fill("Streptococcus pyogenes");
  await owner.getByTestId("add-choice").click();
  await owner.getByTestId("choice-text-2").fill("Treponema pallidum");
  await owner.getByTestId("choice-correct-0").click();
  await owner
    .getByTestId("question-explanation")
    .fill("Most S. aureus strains make beta-lactamase, hence flucloxacillin.");
  await owner.getByTestId("question-year").fill("2023");
  await owner.getByTestId("save-question").click();
  const row = owner
    .getByTestId("question-row")
    .filter({ hasText: "penicillinase" });
  await expect(row).toContainText("2023");
  await row.getByTestId("edit-question").click();
  await owner
    .getByTestId("question-stem")
    .fill("Which organism most often produces penicillinase?");
  await owner.getByTestId("save-question").click();
  await expect(
    owner
      .getByTestId("question-row")
      .filter({ hasText: "most often produces" }),
  ).toBeVisible();
  await owner
    .getByTestId("question-row")
    .first()
    .getByTestId("delete-question")
    .click();
  await owner.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(owner.getByText("No questions yet")).toBeVisible();
  expect(
    await count(
      runtime,
      "select count(*) from choices c join questions q on q.id = c.question_id where q.course_id in (select id from courses where name = 'Penicillins')",
    ),
  ).toBe(0);

  await member.goto("/bank");
  await expect(member.getByTestId("new-source")).toHaveCount(0);
  await expect(
    member
      .getByTestId("source-row")
      .filter({ hasText: "Internal Medicine Past Papers" }),
  ).toContainText("7 questions");
  await member.goto(`/bank/${ids.source}`);
  await expect(
    member.getByTestId("course-row").filter({ hasText: "Heart failure" }),
  ).toContainText("3 questions");

  // F002: exploration with filters, corrections and progress.
  await member.goto("/explore");
  await pickOption(member, "filter-source", "Internal Medicine Past Papers");
  await pickOption(member, "filter-module", "Nephrology");
  await expect(
    member.getByTestId("explore-course").filter({ hasText: "Heart failure" }),
  ).toHaveCount(0);
  await pickOption(member, "filter-module", "All modules");
  await expect(
    member.getByTestId("explore-module").filter({ hasText: "Cardiology" }),
  ).toContainText("0/5 answered");
  await member
    .getByTestId("explore-course")
    .filter({ hasText: "Heart failure" })
    .getByRole("link")
    .click();
  await expect(member.getByTestId("question-stem")).toContainText(
    "lowers mortality",
  );
  await expect(member.getByTestId("explanation")).toHaveCount(0);
  await choice(member, "Beta-blockers").click();
  await member.getByTestId("submit-answer").click();
  await expect(member.getByTestId("answer-result")).toHaveText("Correct");
  await expect(member.getByTestId("explanation")).toContainText("Bisoprolol");
  await member.getByTestId("next-question").click();
  await expect(member.getByTestId("question-stem")).toContainText(
    "congestive heart failure",
  );
  await choice(member, "Raised jugular venous pressure").click();
  await member.getByTestId("submit-answer").click();
  await expect(member.getByTestId("answer-result")).toHaveText("Incorrect");
  await expect(choice(member, "Bibasal crackles")).toHaveAttribute(
    "data-result",
    "missed",
  );
  await member.goto(`/explore?sourceId=${ids.source}`);
  await expect(
    member.getByTestId("explore-course").filter({ hasText: "Heart failure" }),
  ).toContainText("2/3 answered · 1 correct");
  await expect(
    member.getByTestId("explore-module").filter({ hasText: "Cardiology" }),
  ).toContainText("2/5 answered");
  await member
    .getByTestId("explore-course")
    .filter({ hasText: "Heart failure" })
    .getByRole("link")
    .click();
  await expect(member.getByTestId("question-stem")).toContainText(
    "rules out heart failure",
  );

  // F003: revision brings back the missed question first; filters narrow it.
  await member.goto("/revise");
  await expect(member.getByTestId("due-count")).toHaveText("1 due");
  await expect(member.getByTestId("question-stem")).toContainText(
    "congestive heart failure",
  );
  await member.goto(`/revise?moduleId=${ids.neph}`);
  await expect(member.getByText("Nothing to review")).toBeVisible();
  await member.goto("/revise");
  for (const text of [
    "Raised jugular venous pressure",
    "Bibasal crackles",
    "Pitting ankle oedema",
  ])
    await choice(member, text).click();
  await member.getByTestId("submit-answer").click();
  await expect(member.getByTestId("answer-result")).toHaveText("Correct");

  // F006: comments after answering, reactions, deletion.
  await member
    .getByTestId("comment-input")
    .fill("The friction rub belongs to pericarditis, so the key looks right.");
  await member.getByTestId("post-comment").click();
  const comment = member
    .getByTestId("comment")
    .filter({ hasText: "friction rub belongs" });
  await expect(comment).toContainText("member@example.test");
  await member.getByTestId("next-question").click();
  await expect(member.getByText("Nothing to review")).toBeVisible();
  const card = await count(
    runtime,
    "select interval_days from review_cards where user_id = 'member' and question_id = 'q-hf-2'",
  );
  expect(card).toBeGreaterThan(0);

  await owner.goto(`/explore/${ids.hf}?questionId=q-hf-2`);
  await choice(owner, "Bibasal crackles").click();
  await owner.getByTestId("submit-answer").click();
  const seen = owner
    .getByTestId("comment")
    .filter({ hasText: "friction rub belongs" });
  await seen.getByTestId("react-agree").click();
  await expect(seen.getByTestId("react-agree")).toContainText("1");
  await seen.getByTestId("react-agree").click();
  await expect(seen.getByTestId("react-agree")).toContainText("0");
  await seen.getByTestId("react-like").click();
  await expect(seen.getByTestId("react-like")).toContainText("1");
  await owner
    .getByTestId("comment-input")
    .fill("Agreed. Pericarditis rubs are often positional.");
  await owner.getByTestId("post-comment").click();
  await expect(
    owner.getByTestId("comment").filter({ hasText: "positional" }),
  ).toBeVisible();
  await owner
    .getByTestId("comment")
    .filter({ hasText: "positional" })
    .getByTestId("delete-comment")
    .click();
  await owner.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    owner.getByTestId("comment").filter({ hasText: "positional" }),
  ).toHaveCount(0);

  // F004: a past exam set by an admin, taken by a member.
  await owner.goto("/exams");
  await owner.getByTestId("new-past-exam").click();
  await owner.getByTestId("exam-title").fill("Cardiology finals 2023");
  await owner.getByTestId("exam-minutes").fill("20");
  await owner.getByTestId("save-exam").click();
  await expect(owner.getByTestId("exam-editor")).toBeVisible();
  await pickOption(
    owner,
    "pick-course",
    "Internal Medicine Past Papers › Cardiology › Heart failure",
  );
  for (const id of ["q-hf-1", "q-hf-2", "q-hf-3"])
    await owner.getByTestId(`add-${id}`).click();
  await expect(owner.getByTestId("exam-question")).toHaveCount(3);
  await owner
    .getByTestId("exam-question")
    .nth(2)
    .getByTestId("move-up")
    .click();
  await expect(owner.getByTestId("exam-question").nth(1)).toContainText(
    "rules out heart failure",
  );

  await member.goto("/exams");
  await member
    .getByTestId("past-exam")
    .filter({ hasText: "Cardiology finals 2023" })
    .getByTestId("start-exam")
    .click();
  await expect(member.getByTestId("exam-timer")).toBeVisible();
  await expect(member.getByTestId("exam-progress")).toHaveText(
    "Question 1 of 3",
  );
  await choice(member, "Beta-blockers").click();
  await expect(member.getByTestId("answer-result")).toHaveCount(0);
  await member.getByTestId("exam-next").click();
  await expect(member.getByTestId("question-stem")).toContainText(
    "rules out heart failure",
  );
  await Promise.all([
    member.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/_serverFn/"),
    ),
    choice(member, "D-dimer").click(),
  ]);
  await member.reload();
  await expect(member.getByTestId("exam-progress")).toHaveText(
    "Question 1 of 3",
  );
  await expect(choice(member, "Beta-blockers")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await member.getByTestId("submit-exam").click();
  await member.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(member.getByTestId("exam-score")).toHaveText("1 / 3");
  await expect(
    member.getByTestId("result-question").nth(0).getByTestId("answer-result"),
  ).toHaveText("Correct");
  await expect(
    member.getByTestId("result-question").nth(1).getByTestId("answer-result"),
  ).toHaveText("Incorrect");
  await expect(
    member.getByTestId("result-question").nth(1).getByTestId("explanation"),
  ).toContainText("NT-proBNP");

  // Custom exam, drawn at random, closed by the server when time is up.
  await member.goto("/exams/new");
  await member
    .getByTestId("scope-module")
    .filter({ hasText: "Nephrology" })
    .click();
  await member.getByTestId("question-count").fill("2");
  await member.getByTestId("duration").fill("5");
  await member.getByTestId("start-custom").click();
  await expect(member.getByTestId("exam-progress")).toHaveText(
    "Question 1 of 2",
  );
  await expect(member.getByTestId("question-stem")).toContainText(
    /kidney|creatinine/,
  );
  const db = await runtime.database();
  await db
    .prepare(
      "update attempts set deadline_at = ? where user_id = 'member' and submitted_at is null",
    )
    .bind(Date.now() - 1000)
    .run();
  await member.reload();
  await expect(member.getByTestId("exam-score")).toHaveText("0 / 2");
  await member.goto("/exams");
  await expect(member.getByTestId("attempt-row")).toHaveCount(2);
  await expect(
    member
      .getByTestId("attempt-row")
      .filter({ hasText: "Cardiology finals 2023" }),
  ).toContainText("1 / 3");

  // F005: the member's own statistics.
  await member.goto("/stats");
  await expect(member.getByTestId("stat-answered")).toHaveText("3");
  await expect(member.getByTestId("stat-success")).toHaveText("67%");
  await expect(
    member.getByTestId("stats-module").filter({ hasText: "Cardiology" }),
  ).toContainText("3 of 5");
  await expect(member.getByTestId("stat-remaining")).toHaveText("4");
  await pickOption(
    member,
    "stats-filter",
    "Internal Medicine Past Papers › Nephrology",
  );
  await expect(member.getByTestId("stat-remaining")).toHaveText("2");
  await expect(member.getByTestId("stats-attempt")).toHaveCount(2);
  await expect(member.getByTestId("stat-due")).toHaveText("1");
  await expect(member.getByTestId("stat-learning")).toHaveText("3");

  // F007: history and resume.
  await member.goto("/explore/" + ids.af);
  await choice(member, "Bisoprolol").click();
  await member.getByTestId("submit-answer").click();
  await member.goto("/");
  await expect(member.getByTestId("resume-card")).toContainText("Arrhythmias");
  await member.getByTestId("resume-link").click();
  await expect(member.getByTestId("question-stem")).toContainText(
    "atrial flutter",
  );
  await member.goto("/history");
  await expect(member.getByTestId("history-row").first()).toContainText(
    "Arrhythmias",
  );
  await expect(
    member.getByTestId("history-row").filter({ hasText: "Heart failure" }),
  ).toBeVisible();
  await expect(
    member
      .getByTestId("history-row")
      .filter({ hasText: "Cardiology finals 2023" }),
  ).toBeVisible();

  // The journey ends on an answered question with its correction.
  await runtime.assertBackLink(member);
  await member.goto(`/explore/${ids.af}`);
  await choice(member, "Sawtooth flutter waves").click();
  await member.getByTestId("submit-answer").click();
  await expect(member.getByTestId("answer-result")).toHaveText("Correct");
  await runtime.screenshot(member);

  // Phone-sized smoke.
  const phone = await (
    await runtime.context("member", {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
  ).newPage();
  await phone.goto("/explore");
  await expect(phone.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(phone.getByTestId("explore-course").first()).toBeVisible();
  console.log("behavior: ok");
} finally {
  await runtime.close();
}
