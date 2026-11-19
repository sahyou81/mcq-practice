import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import { seed, ids } from "./seed.mjs";

const runtime = await startRuntime();
try {
  await seed(await runtime.database());
  let owner = await (await runtime.context("owner")).newPage();
  await owner.goto("/bank");
  await owner.getByTestId("new-source").click();
  await owner.getByTestId("source-name").fill("Paediatrics Revision Book");
  await owner.getByTestId("save-source").click();
  await expect(
    owner
      .getByTestId("source-row")
      .filter({ hasText: "Paediatrics Revision Book" }),
  ).toBeVisible();

  let member = await (await runtime.context("member")).newPage();
  await member.goto(`/explore/${ids.aki}`);
  await member.getByTestId("choice").filter({ hasText: "Paracetamol" }).click();
  await member.getByTestId("submit-answer").click();
  await expect(member.getByTestId("answer-result")).toHaveText("Incorrect");
  await member
    .getByTestId("comment-input")
    .fill("Ramipril should restart once creatinine settles.");
  await member.getByTestId("post-comment").click();
  await expect(member.getByTestId("comment")).toHaveCount(1);

  await runtime.restart();

  owner = await (await runtime.context("owner")).newPage();
  await owner.goto("/bank");
  await expect(
    owner
      .getByTestId("source-row")
      .filter({ hasText: "Paediatrics Revision Book" }),
  ).toBeVisible();
  member = await (await runtime.context("member")).newPage();
  await member.goto(`/explore?sourceId=${ids.source}`);
  await expect(
    member
      .getByTestId("explore-course")
      .filter({ hasText: "Acute kidney injury" }),
  ).toContainText("1/2 answered · 0 correct");
  await member.goto("/revise");
  await expect(member.getByTestId("due-count")).toHaveText("1 due");
  await member.getByTestId("choice").filter({ hasText: "Ramipril" }).click();
  await member.getByTestId("submit-answer").click();
  await expect(
    member
      .getByTestId("comment")
      .filter({ hasText: "Ramipril should restart" }),
  ).toBeVisible();
  await member.goto("/");
  await expect(member.getByTestId("resume-card")).toContainText(
    "Acute kidney injury",
  );
  console.log("persistence: ok");
} finally {
  await runtime.close();
}
