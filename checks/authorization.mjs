import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import { seed, ids, capture, replay, count, isRefused } from "./seed.mjs";

const runtime = await startRuntime();
try {
  await seed(await runtime.database());
  await runtime.assertPrivateAccess([
    "/",
    "/bank",
    `/bank/${ids.source}`,
    "/explore",
    "/revise",
    "/exams",
    "/exams/new",
    "/stats",
    "/history",
  ]);

  // No sign-in page of the app's own.
  for (const path of [
    "/login",
    "/signin",
    "/sign-up",
    "/register",
    "/logout",
  ]) {
    const anonymous = await runtime.fetch(path);
    expect(
      anonymous.status === 200 && /password/i.test(await anonymous.text()),
    ).toBe(false);
    const signedIn = await runtime.fetch(path, { role: "member" });
    expect(/type="password"/i.test(await signedIn.text())).toBe(false);
  }
  const outsider = await runtime.fetch("/bank", { role: "outsider" });
  expect(outsider.status).not.toBe(200);

  const owner = await (await runtime.context("owner")).newPage();
  const member = await (await runtime.context("member")).newPage();
  const choice = (page, text) =>
    page.getByTestId("choice").filter({ hasText: text });

  // Admin-only bank changes: hidden from members and refused on replay.
  await owner.goto("/bank");
  await owner.getByTestId("new-source").click();
  await owner.getByTestId("source-name").fill("Surgery Question Book");
  const createSource = await capture(owner, () =>
    owner.getByTestId("save-source").click(),
  );
  await expect(
    owner
      .getByTestId("source-row")
      .filter({ hasText: "Surgery Question Book" }),
  ).toBeVisible();
  expect(await count(runtime, "select count(*) from sources")).toBe(2);
  expect(await isRefused(await replay(runtime, createSource, "member"))).toBe(
    true,
  );
  expect(await count(runtime, "select count(*) from sources")).toBe(2);
  expect(await isRefused(await replay(runtime, createSource, "outsider"))).toBe(
    true,
  );
  expect(await count(runtime, "select count(*) from sources")).toBe(2);

  await member.goto(`/bank/course/${ids.hf}`);
  await expect(member.getByTestId("new-question")).toHaveCount(0);
  await expect(member.getByTestId("edit-question")).toHaveCount(0);
  await member.goto(`/bank/course/${ids.hf}/new`);
  await expect(member.getByText("Only admins can edit the bank")).toBeVisible();
  await member.goto(`/exams`);
  await expect(member.getByTestId("new-past-exam")).toHaveCount(0);

  // Corrections stay on the server until the member has answered.
  await member.goto(`/explore/${ids.hf}`);
  await expect(member.getByTestId("question-stem")).toContainText(
    "lowers mortality",
  );
  expect(await member.content()).not.toContain(
    "Bisoprolol and other beta-blockers",
  );
  expect(await member.content()).not.toMatch(/isCorrect|"correct"/);
  await expect(member.getByTestId("comment-input")).toHaveCount(0);

  // A member's exam attempt is theirs alone.
  await owner.goto("/exams/new");
  await owner
    .getByTestId("scope-module")
    .filter({ hasText: "Cardiology" })
    .click();
  await owner.getByTestId("question-count").fill("3");
  await owner.getByTestId("duration").fill("10");
  await owner.getByTestId("start-custom").click();
  await expect(owner.getByTestId("exam-progress")).toHaveText(
    "Question 1 of 3",
  );
  const attemptPath = new URL(owner.url()).pathname;
  const save = await capture(owner, () =>
    owner.getByTestId("choice").first().click(),
  );
  expect(await count(runtime, "select count(*) from attempt_answers")).toBe(1);
  await owner.getByTestId("choice").nth(1).click();
  await member.goto(attemptPath);
  await expect(member.getByText("Exam attempt not found")).toBeVisible();
  await expect(member.getByTestId("question-stem")).toHaveCount(0);
  expect(await member.content()).not.toContain("is_correct");
  const before = await count(runtime, "select selected from attempt_answers");
  expect(await isRefused(await replay(runtime, save, "member"))).toBe(true);
  expect(await count(runtime, "select selected from attempt_answers")).toBe(
    before,
  );
  await member.goto("/exams");
  await expect(member.getByTestId("attempt-row")).toHaveCount(0);
  await expect(member.getByTestId("past-exam")).toHaveCount(0);

  // Answers after the deadline are refused by the server.
  const db = await runtime.database();
  await db
    .prepare("update attempts set deadline_at = ?")
    .bind(Date.now() - 1000)
    .run();
  expect(await isRefused(await replay(runtime, save, "owner"))).toBe(true);

  // Stats and history are per member.
  await owner.goto(`/explore/${ids.hf}`);
  await choice(owner, "Beta-blockers").click();
  await owner.getByTestId("submit-answer").click();
  await expect(owner.getByTestId("answer-result")).toHaveText("Correct");
  await member.goto("/stats");
  await expect(member.getByTestId("stat-answered")).toHaveText("0");
  await member.goto("/history");
  await expect(member.getByTestId("history-row")).toHaveCount(0);
  await member.goto("/revise");
  await expect(member.getByText("Nothing to review")).toBeVisible();

  // Comments: only the author or an admin deletes; posting needs an answer first.
  await owner
    .getByTestId("comment-input")
    .fill("Beta-blockers need slow up-titration.");
  await owner.getByTestId("post-comment").click();
  await expect(
    owner.getByTestId("comment").filter({ hasText: "slow up-titration" }),
  ).toBeVisible();
  await owner.getByTestId("comment-input").fill("Start low, go slow.");
  await owner.getByTestId("post-comment").click();
  await expect(
    owner.getByTestId("comment").filter({ hasText: "Start low" }),
  ).toBeVisible();
  const firstId = await count(
    runtime,
    "select id from comments where body like 'Beta-blockers%'",
  );
  const secondId = await count(
    runtime,
    "select id from comments where body like 'Start low%'",
  );
  const removal = await capture(owner, async () => {
    await owner
      .getByTestId("comment")
      .filter({ hasText: "Start low" })
      .getByTestId("delete-comment")
      .click();
    await owner.getByRole("button", { name: "Delete", exact: true }).click();
  });
  expect(removal.body).toContain(secondId);
  await expect(
    owner.getByTestId("comment").filter({ hasText: "Start low" }),
  ).toHaveCount(0);
  await member.goto(`/explore/${ids.hf}`);
  await choice(member, "Digoxin").click();
  await member.getByTestId("submit-answer").click();
  const ownerComment = member
    .getByTestId("comment")
    .filter({ hasText: "slow up-titration" });
  await expect(ownerComment).toBeVisible();
  await expect(ownerComment.getByTestId("delete-comment")).toHaveCount(0);
  expect(
    await isRefused(
      await replay(
        runtime,
        removal,
        "member",
        removal.body.replace(secondId, firstId),
      ),
    ),
  ).toBe(true);
  expect(
    await count(runtime, "select count(*) from comments where id = ?", firstId),
  ).toBe(1);

  const post = await capture(member, () =>
    member
      .getByTestId("comment-input")
      .fill("Digoxin only helps symptoms.")
      .then(() => member.getByTestId("post-comment").click()),
  );
  await expect(
    member.getByTestId("comment").filter({ hasText: "Digoxin only" }),
  ).toBeVisible();
  const before2 = await count(runtime, "select count(*) from comments");
  const unanswered = post.body.replace("q-hf-1", "q-aki-2");
  expect(unanswered).toContain("q-aki-2");
  expect(
    await isRefused(await replay(runtime, post, "member", unanswered)),
  ).toBe(true);
  expect(await count(runtime, "select count(*) from comments")).toBe(before2);
  // An admin may delete anyone's comment.
  await owner.goto(`/explore/${ids.hf}?questionId=q-hf-1`);
  await owner
    .getByTestId("comment")
    .filter({ hasText: "Digoxin only" })
    .getByTestId("delete-comment")
    .click();
  await owner.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    owner.getByTestId("comment").filter({ hasText: "Digoxin only" }),
  ).toHaveCount(0);
  console.log("authorization: ok");
} finally {
  await runtime.close();
}
