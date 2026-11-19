// Sample bank shared by the suites: one source, two modules, three courses.
const Q = [
  [
    "q-hf-1",
    "crs-hf",
    1,
    "Which drug class lowers mortality in heart failure with reduced ejection fraction?",
    "Bisoprolol and other beta-blockers improve survival; loop diuretics only relieve congestion.",
    2022,
    [
      ["Beta-blockers", 1],
      ["Loop diuretics", 0],
      ["Digoxin", 0],
      ["Verapamil", 0],
    ],
  ],
  [
    "q-hf-2",
    "crs-hf",
    2,
    "Which signs point to congestive heart failure? Select all that apply.",
    "A friction rub suggests pericarditis rather than heart failure.",
    2023,
    [
      ["Raised jugular venous pressure", 1],
      ["Bibasal crackles", 1],
      ["Pericardial friction rub", 0],
      ["Pitting ankle oedema", 1],
    ],
  ],
  [
    "q-hf-3",
    "crs-hf",
    3,
    "Which blood test best rules out heart failure in a breathless patient?",
    "A normal NT-proBNP makes heart failure unlikely.",
    null,
    [
      ["NT-proBNP", 1],
      ["Troponin T", 0],
      ["D-dimer", 0],
      ["C-reactive protein", 0],
    ],
  ],
  [
    "q-af-1",
    "crs-af",
    1,
    "First-line rate control for atrial fibrillation without heart failure?",
    "A beta-blocker or a rate-limiting calcium channel blocker comes first.",
    2021,
    [
      ["Bisoprolol", 1],
      ["Amiodarone", 0],
      ["Adenosine", 0],
      ["Flecainide", 0],
    ],
  ],
  [
    "q-af-2",
    "crs-af",
    2,
    "Which ECG feature is typical of atrial flutter?",
    "Flutter waves at about 300 per minute give the sawtooth baseline.",
    2022,
    [
      ["Sawtooth flutter waves", 1],
      ["Delta wave", 0],
      ["Prolonged PR interval", 0],
    ],
  ],
  [
    "q-aki-1",
    "crs-aki",
    1,
    "Which medicines are usually withheld during acute kidney injury? Select all that apply.",
    "ACE inhibitors and NSAIDs reduce renal perfusion.",
    2023,
    [
      ["Ramipril", 1],
      ["Ibuprofen", 1],
      ["Paracetamol", 0],
      ["Amoxicillin", 0],
    ],
  ],
  [
    "q-aki-2",
    "crs-aki",
    2,
    "Which rise in serum creatinine within 48 hours meets the AKI definition?",
    "A rise of 26 micromol/L or more within 48 hours defines AKI.",
    2024,
    [
      ["26 micromol/L or more", 1],
      ["10 micromol/L or more", 0],
      ["Any rise above baseline", 0],
    ],
  ],
];

export const ids = {
  source: "src-im",
  cardio: "mod-cardio",
  neph: "mod-neph",
  hf: "crs-hf",
  af: "crs-af",
  aki: "crs-aki",
};

export async function seed(db) {
  const statements = [
    db
      .prepare("insert into sources (id, name, description) values (?, ?, ?)")
      .bind(
        "src-im",
        "Internal Medicine Past Papers",
        "Finals questions, 2021 to 2024",
      ),
    db
      .prepare(
        "insert into modules (id, source_id, name, position) values (?, ?, ?, ?)",
      )
      .bind("mod-cardio", "src-im", "Cardiology", 1),
    db
      .prepare(
        "insert into modules (id, source_id, name, position) values (?, ?, ?, ?)",
      )
      .bind("mod-neph", "src-im", "Nephrology", 2),
    db
      .prepare(
        "insert into courses (id, module_id, name, position) values (?, ?, ?, ?)",
      )
      .bind("crs-hf", "mod-cardio", "Heart failure", 1),
    db
      .prepare(
        "insert into courses (id, module_id, name, position) values (?, ?, ?, ?)",
      )
      .bind("crs-af", "mod-cardio", "Arrhythmias", 2),
    db
      .prepare(
        "insert into courses (id, module_id, name, position) values (?, ?, ?, ?)",
      )
      .bind("crs-aki", "mod-neph", "Acute kidney injury", 1),
  ];
  for (const [id, course, position, stem, explanation, year, choices] of Q) {
    statements.push(
      db
        .prepare(
          "insert into questions (id, course_id, stem, explanation, exam_year, position) values (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, course, stem, explanation, year, position),
    );
    choices.forEach(([text, correct], index) => {
      statements.push(
        db
          .prepare(
            "insert into choices (id, question_id, text, is_correct, position) values (?, ?, ?, ?, ?)",
          )
          .bind(`${id}-c${index}`, id, text, correct, index),
      );
    });
  }
  await db.batch(statements);
}

/** Records the first server-function POST the trigger sends, to replay it as someone else. */
export async function capture(page, trigger) {
  const [request] = await Promise.all([
    page.waitForRequest(
      (r) => r.method() === "POST" && r.url().includes("/_serverFn/"),
    ),
    trigger(),
  ]);
  const url = new URL(request.url());
  const headers = {};
  for (const [name, value] of Object.entries(request.headers())) {
    if (name === "content-type" || name === "accept" || name.startsWith("x-"))
      headers[name] = value;
  }
  return { path: url.pathname + url.search, body: request.postData(), headers };
}

export function replay(runtime, captured, role, body = captured.body) {
  return runtime.fetch(captured.path, {
    role,
    method: "POST",
    headers: captured.headers,
    body,
  });
}

export async function pickOption(page, triggerTestId, optionName) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

export async function count(runtime, sql, ...params) {
  const row = await (
    await runtime.database()
  )
    .prepare(sql)
    .bind(...params)
    .first();
  return Object.values(row)[0];
}

/** A server function refuses with an error status, or with 200 and a serialized error in place of a result. */
export async function isRefused(response) {
  if (response.status >= 400) return true;
  const text = await response.text();
  return response.status === 200 && text.includes("$TSR/Error");
}
