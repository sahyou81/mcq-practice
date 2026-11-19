# MCQ Practice

A shared bank of multiple-choice questions that your team's admins fill and every member practises from: course by course, in spaced-repetition revision, and in timed exams.

Inspired by https://cramqcm.app

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Admins organise questions into sources, modules and courses; members browse the bank with question counts.
- Answer a course's questions one by one, see the correction and explanation, and pick up at the first unanswered question.
- Revise the questions due today, weakest first, on a schedule that adapts to each answer.
- Sit past exams set by admins or custom exams drawn at random, timed and scored by the server.
- Follow your answered count, success rate per module, questions remaining, revision state and exam scores.
- Discuss a question after answering it, with likes and agrees on comments.
- See your recent courses and exams and resume each where you stopped.

Left out: accounts and sign-in, which your Gateway handles; paid plans; a bundled question corpus; social links and polls; a zoom widget.

## Setup

```sh
pnpm install
pnpm dev            # run locally behind the local Gateway
pnpm test           # unit tests
pnpm run deploy     # deploy to your Cloudflare account through your Gateway
```

The app needs no secrets or settings: its D1 database is created on deploy. Organization owners and admins edit the bank and past exams; everyone else studies.

The packaged-release checks in `checks/` run against a built release with the oss.new runtime.

## Limitations

- The bank starts empty; questions are entered one at a time in the editor.
- Questions are text only, with up to ten choices each.
- An exam's timer keeps running if you close the page; the attempt is submitted when time runs out.
