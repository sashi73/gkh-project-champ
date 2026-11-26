# GKH Project Champ: build registry

Every commit gets the next build number (git pre-commit hook, `tools/build-bump.mjs`) and a row here.
The row is completed with the commit id and title by the next commit. The commit message carries `Build: N`,
so `git log --grep "Build: 12"` finds it. Each Netlify deploy records its build, commit and deploy id in the
console under **Admin > Builds**, and publishes them at `/build.json`.

Version = product version + build number (1.0.12 = version 1.0, build 12). Times are Sydney time.

| Build | Version | Date | Branch | Commit | Change |
|---|---|---|---|---|---|
| 1 | 1.0.1 | 2026-11-12 09:07 | GKH-Project-Champ | `b30ce4c` | GKH Project Champ PC 1.0: project element of the test console as its own product |
| 2 | 1.0.2 | 2026-11-12 09:11 | GKH-Project-Champ | `87fb43e` | BOM on/off slider per project; login page hides the contractor project-code box |
| 3 | 1.0.3 | 2026-11-12 19:25 | GKH-Project-Champ | `e1efd8d` | Champ assistant (multilingual chat) and a one-click light/dark slider |
| 4 | 1.0.4 | 2026-11-12 19:38 | GKH-Project-Champ | `b4982a6` | Page language on the fly, Champ voice (Azure, Australia East), glow, top-right controls, logo far left |
| 5 | 1.0.5 | 2026-11-12 19:39 | GKH-Project-Champ | `fa4fb7a` | Netlify: don't treat LLM_MAX_TOKENS (a plain number) as a secret; it blocked deploys |
| 6 | 1.0.6 | 2026-11-12 20:37 | GKH-Project-Champ | `3925147` | Delete projects (board menu, Summary bulk delete, Projects list, plan page) |
| 7 | 1.0.7 | 2026-11-12 20:53 | GKH-Project-Champ | `7ef55dc` | ⚙ Modules: switch BOM and SWMS on or off per project |
| 8 | 1.0.8 | 2026-11-12 21:01 | GKH-Project-Champ | `37fd2a5` | Ask AI for projects, programs and the portfolio; programs; no chat bubble in the console |
| 9 | 1.0.9| 2026-11-12 21:36| GKH-Project-Champ| `fd1241a` | Project Champ: automatic build numbers and a build registry |
| 10 | 1.0.10| 2026-11-12 21:47| GKH-Project-Champ| `04e888b` | Champ: seamless language switching and a main menu |
| 11 | 1.0.11| 2026-11-12 21:50| GKH-Project-Champ| `c9e9f4f` | Champ: long menu labels wrap instead of scrolling sideways; a blocked autoplay waits quietly for the Listen button |
| 12 | 1.0.12| 2026-11-12 22:21| GKH-Project-Champ| `51cb23e` | Champ: speak or type in any language (🎤 with Azure language identification) |
| 13 | 1.0.13| 2026-11-12 22:28| GKH-Project-Champ| `c2941dc` | Champ ears: Portuguese listens as pt-PT (pt-BR is refused in australiaeast); one automatic retry when Azure is busy |
| 14 | 1.0.14| 2026-11-12 22:30| GKH-Project-Champ| `7b9968a` | Champ ears: 'any language' mode (Azure multilingual model, no list) |
| 15 | 1.0.15| 2026-11-12 22:33| GKH-Project-Champ| `39412c4` | Champ ears: two listening modes, My languages (accurate, Tamil/Malay/Persian) and Any language (incl. Portuguese) |
| 16 | 1.0.16| 2026-11-13 00:13| GKH-Project-Champ| `a21f802` | Share preview: GKH Project Champ card with the globe (WhatsApp, LinkedIn, X); globe icons replace the MBS ones |
| 17 | 1.0.17| 2026-11-13 00:50| GKH-Project-Champ| `bcc5498` | Share preview: new file names for every GKH logo (WhatsApp kept the old MBS icon by file name); globe centred so a square thumbnail shows it |
| 18 | 1.0.18| 2026-11-13 01:07| GKH-Project-Champ| `e45b12f` | Champ welcome: language first ("switch to …" any time), then name, phone with country code, email read back to confirm, welcome package; eve |
| 19 | 1.0.19| 2026-11-13 01:25| GKH-Project-Champ| `91b30dd` | Cinematic 10-second intro on the home page (Plan, Gantt chart, critical path, PM tools, title) with a live hero score; visitor counter in th |
| 20 | 1.0.20| 2026-11-13 01:35| GKH-Project-Champ| `8a4b655` | Champ welcome: the Main menu link no longer ends the questions (☰ only pauses them for this visit); visitors who shared nothing are greeted  |
| 21 | 1.0.21| 2026-11-13 01:41| GKH-Project-Champ| `7c5a49e` | Intro start screen: pick your language (English by default); the intro, the website and Champ all follow, and Champ greets in it and goes st |
| 22 | 1.0.22| 2026-11-13 01:51| GKH-Project-Champ| `ca713c4` | Voice input: answer inside Netlify's 10-second limit (clear 'too long' message, one retry only when there's time), show the real reason on e |
| 23 | 1.0.23| 2026-11-13 01:57| GKH-Project-Champ| `828de2b` | Champ hands-free: switch the microphone on and Champ listens after each question (and after each spoken answer); 'Hey Champ' wakes it; say ' |
| 24 | 1.0.24| 2026-11-13 02:00| GKH-Project-Champ| `93092e9` | Intro start screen: language picker on one line |
| 25 | 1.0.25| 2026-11-13 02:05| GKH-Project-Champ| `d39afb9` | Intro: language picker at the bottom left |
| 26 | 1.0.26| 2026-11-13 02:08| GKH-Project-Champ| `cc46145` | Voice: Champ listens in the chosen language for the welcome answers (name, phone; email in English), and a short answer Azure can't place is |
| 27 | 1.0.27| 2026-11-13 02:29| GKH-Project-Champ| `4b9cd89` | Champ welcome rebuilt: greeting, language by voice or tap, then a typed form (first and last name, phone with country code, email, reason fo |
| 28 | 1.0.28| 2026-11-13 02:32| GKH-Project-Champ| `2431460` | Champ form: consent tick beside its text |
| 29 | 1.0.29| 2026-11-13 08:32| GKH-Project-Champ| `e14508f` | Not remembering visitors for now (one switch, CHAMP_REMEMBER, to turn it on later): every new visit starts fresh in English with the greetin |
| 30 | 1.0.30| 2026-11-13 08:45| GKH-Project-Champ| `9620768` | Home: 'Ask Champ' section for project questions (answered first, then the welcome); Contact: enquiry form with the PDPA notice and consent,  |
| 31 | 1.0.31| 2026-11-13 08:46| GKH-Project-Champ| `8848140` | Contact form: thank-you box hidden until sent; ticks and radio buttons beside their labels |
| 32 | 1.0.32| 2026-11-13 08:53| GKH-Project-Champ| `ab89012` | Voice: listening that starts by itself now hears you (sound meter resumed and tuned to the room, never drops a recording silently); short sp |
| 33 | 1.0.33| 2026-11-13 09:17| GKH-Project-Champ| `ca07b38` | Champ: chat capped at 2000 tokens per question (shorter instructions, recent conversation trimmed to fit, 450-token answers) and a more natu |
| 34 | 1.0.34| 2026-11-13 09:25| GKH-Project-Champ| `e853f5a` | About page: GKH introduction from gkhconsultancy.com (since 2010, 8 countries, 14 with partners, seven practices, selected national programs |
| 35 | 1.0.35| 2026-11-13 20:43| GKH-Project-Champ| `c13152e` | Programs and projects in two levels: Programs are real records (manager, sponsor, objective, status, colour, target dates) and every project |
| 36 | 1.0.36| 2026-11-13 21:04| GKH-Project-Champ| `18851fa` | Project Intelligence re-plan on the fly: a re-plan question (new length, finish date or budget, review gates) becomes a worked-out task-by-t |
| 37 | 1.0.37| 2026-11-13 21:34| GKH-Project-Champ| `869499c` | Project page (was Job): Client & project details, the stage path Pre-sales → Proposal submitted → Invoiced (milestone payments 1 to 12, amou |
| 38 | 1.0.38| 2026-11-13 22:03| GKH-Project-Champ| `eb9f6c2` | Project types: 7 GKH practices x 4 consulting types; About links to the GKH website |
| 39 | 1.0.39| 2026-11-14 00:18| GKH-Project-Champ| `4935df7` | Project types: General and fun projects for learning project management |
| 40 | 1.0.40| 2026-11-14 01:11| GKH-Project-Champ| `f6e2e45` | Project types: one program per category, link related projects |
| 41 | 1.0.41| 2026-11-14 01:14| GKH-Project-Champ| `7e2e50b` | Project types: one program per category, link related projects |
| 42 | 1.0.42| 2026-11-14 01:38| GKH-Project-Champ| `6f6e2de` | Change control records kept for good; no cooling-off or emergency; types fit the Finish by date |
| 43 | 1.0.43| 2026-11-14 02:25| GKH-Project-Champ| `a2f8e8b` | Budget window, designed project charter and 20-page project plan (PDF and Word), in the chosen language |
| 44 | 1.0.44| 2026-11-14 03:10| GKH-Project-Champ| `4f4b6d3` | Sticky notes on tasks (Kanban and Gantt); Khmer (Cambodian) language |
| 45 | 1.0.45| 2026-11-14 10:15| GKH-Project-Champ| `c736a59` | Charter and plan: fully in the chosen language; colour schemes |
| 46 | 1.0.46| 2026-11-14 10:42| GKH-Project-Champ| `e6d9154` | Sticky notes: edit in place, tick boxes, checklists |
| 47 | 1.0.47| 2026-11-14 11:08| GKH-Project-Champ| `03de9c4` | Project types: 16 cloud projects |
| 48 | 1.0.48| 2026-11-14 12:15| GKH-Project-Champ| `2fa9b18` | Whole console in the chosen language; Costing with the signed-off BOM; change control as a module; no Inventory; draggable notes |
| 49 | 1.0.49| 2026-11-14 15:17| GKH-Project-Champ| `f9a3767` | BOM: delete, one per project, opens from the costing; signed budget approval |
| 50 | 1.0.50| 2026-11-14 16:09| GKH-Project-Champ| `deb4d59` | Champ: this-week card, cost follows progress, Things to order, Inventory removed, script typography |
| 51 | 1.0.51| 2026-11-14 16:56| GKH-Project-Champ| `6ff0fa4` | Champ: Sign in with Google only shows with a real OAuth client ID |
| 52 | 1.0.52| 2026-11-14 17:22| GKH-Project-Champ| `4b22a35` | Champ: add level-1 tasks anywhere (schedule and Kanban) with their costing |
| 53 | 1.0.53| 2026-11-14 17:49| GKH-Project-Champ| `40028c9` | Champ: Users & access reworked: super user, project managers, contractors, project personnel, Google view only |
| 54 | 1.0.54| 2026-11-14 18:09| GKH-Project-Champ| `59a1dc5` | Champ: sticky notes save with Enter; all done turns the note blue with a tick |
| 55 | 1.0.55| 2026-11-14 19:12| GKH-Project-Champ| `b9b451a` | Champ: People rebuilt: two groups, credentials, resume, rate per hour, My profile, team calendar, workload |
| 56 | 1.0.56| 2026-11-14 19:32| GKH-Project-Champ| `223b460` | Champ: rates in plain $ (no AUD): People form and AI prompts are not tied to a country |
| 57 | 1.0.57| 2026-11-14 19:50| GKH-Project-Champ| `38c8792` | Champ: picking a program on New project fills in its details |
| 58 | 1.0.58| 2026-11-14 21:07| GKH-Project-Champ| `3538926` | Champ: Kubernetes, Docker, Docker+Kubernetes templates; Kanban full view as one picture |
| 59 | 1.0.59| 2026-11-14 21:37| GKH-Project-Champ| `334d792` | Champ: Ask Champ in the dashboard: tap the mic, ask how, and Champ shows you where to click |
| 60 | 1.0.60| 2026-11-14 22:51| GKH-Project-Champ| `53aec51` | Champ: Ask Champ speaks, says hello, picks a language, has a menu and answers project questions |
| 61 | 1.0.61| 2026-11-15 00:05| GKH-Project-Champ| `08b0bd5` | Champ: Ask Champ works in every language; translate the whole project into the console language |
| 62 | 1.0.62| 2026-11-15 01:27| GKH-Project-Champ| `184a7bd` | Champ on a phone: a simpler console; chatbots listen with the browser and speak on phones |
| 63 | 1.0.63| 2026-11-15 02:09| GKH-Project-Champ| `4ef9fb1` | Champ: switching languages leaves nothing behind; project data goes back to English exactly |
| 64 | 1.0.64| 2026-11-15 13:48| GKH-Project-Champ| `41cc43b` | People: fill in a person from their resume (PDF or Word) |
| 65 | 1.0.65| 2026-11-15 14:10| GKH-Project-Champ| `7ba0845` | Champ: the 'Schedule & Gantt' tab is now just 'Gantt' |
| 66 | 1.0.66| 2026-11-15 14:47| GKH-Project-Champ| `b450cba` | Champ: 'Project Intelligence' is now 'Ask AI'; the Champ skill keeps Champ up to date; Champ answers from the left menu's data |
| 67 | 1.0.67| 2026-11-15 15:55| GKH-Project-Champ| `615a2e5` | Champ: Product Backlog with Kanban (WIP limits) or Scrum (2 or 4 week sprints, goal, start/complete, retro charts) |
| 68 | 1.0.68| 2026-11-15 16:22| GKH-Project-Champ| `61d186f` | Champ: designed reports (4 skins x colour schemes, live preview) and AI fill + Fibonacci points in the backlog |
| 69 | 1.0.69| 2026-11-15 17:02| GKH-Project-Champ| `7a83c4c` | Champ: edit items and stories from sprint planning, sprint achievability check, plan the sprints with AI |
| 70 | 1.0.70| 2026-11-15 18:07| GKH-Project-Champ| `c1b9c67` | Champ: sign-in log in Visitors (name, email, IP, location, device; failed tries too) |
| 71 | 1.0.71| 2026-11-15 18:55| GKH-Project-Champ| `bfcea87` | Champ: start a new project from a document (requirements, feasibility study, RFP) with RAG, and plan from it |
| 72 | 1.0.72| 2026-11-15 22:05| GKH-Project-Champ| `3531c8c` | Champ: labour costed as people x hours x rate; Gantt resources use the Stakeholder register |
| 73 | 1.0.73| 2026-11-15 22:52| GKH-Project-Champ| `b5d5a8e` | Champ: AI daily limit 500 questions by default (was 50) |
| 74 | 1.0.74| 2026-11-16 11:18| GKH-Project-Champ| `7e7c173` | Champ: Knowledge base (Sashi's class material) used by Ask AI and Ask Champ, credited to Sashi |
| 75 | 1.0.75| 2026-11-16 12:06| GKH-Project-Champ| `cc3dd02` | Champ: Super user named; project managers and directors run projects and add team logins; upgrade Google sign-ins |
| 76 | 1.0.76| 2026-11-16 12:36| GKH-Project-Champ| `c0413c2` | Champ: knowledge base is a second reference: the AI's own knowledge first, Sashi's notes only when clearly relevant |
| 77 | 1.0.77| 2026-11-16 13:25| GKH-Project-Champ| `80d624a` | Champ website: simple yes/no flow: keep in touch? -> form or main menu; Ask box answers straight away, then "any other questions?" |
| 78 | 1.0.78| 2026-11-16 14:23| GKH-Project-Champ| `ab6d5ca` | Champ: WBS view on the Gantt (read only), saved as PNG or JPEG |
| 79 | 1.0.79| 2026-11-16 16:01| GKH-Project-Champ| `ab6d5ca` | Champ: WBS view on the Gantt (read only), saved as PNG or JPEG |
| 80 | 1.0.80| 2026-11-16 16:01| GKH-Project-Champ| `24e2fb5` | Build 79: R2 storage for original files (KB, Ask AI, new-project documents, charters, contracts, transcripts), Excel reading; costing fix (n |
| 81 | 1.0.81| 2026-11-16 18:18| GKH-Project-Champ| `24e2fb5` | Build 79: R2 storage for original files (KB, Ask AI, new-project documents, charters, contracts, transcripts), Excel reading; costing fix (n |
| 82 | 1.0.82| 2026-11-16 18:18| GKH-Project-Champ| `f3c60bb` | Builds 81-82: Champ's project watch. Red/amber/green health rules, Champ's brief first in a project (background AI), coloured Ask Champ butt |
| 83 | 1.0.83| 2026-11-16 18:27| GKH-Project-Champ| `8d5f816` | Champ: in a project, Champ's view is the hello (no second greeting) |
| 84 | 1.0.84| 2026-11-16 18:49| GKH-Project-Champ| `4b828d6` | Stakeholders: remove the Add a subbie picker |
| 85 | 1.0.85| 2026-11-16 20:00| GKH-Project-Champ| `0e0f767` | Gantt: AI works out the dependencies (review, finish impact, apply, undo) and dependency arrows; Champ reads the whole brief loud and clear  |
| 86 | 1.0.86| 2026-11-16 20:45| GKH-Project-Champ| `72593e7` | Champ reads a short brief: headline, the summary in one line, the steps by title, what to watch, an offer to help |
| 87 | 1.0.87| 2026-11-16 20:49| GKH-Project-Champ| `73ee6cc` | Champ: a different friendly sign-off each time it reads a brief |
| 88 | 1.0.88| 2026-11-17 00:26| GKH-Project-Champ| `85e1a28` | Project documents: each project's own repository in R2 (folders, auto-filing, status, owner, tags, versions, search), AI analysis of a docum |
| 89 | 1.0.89| 2026-11-17 01:42| GKH-Project-Champ| `070e4ca` | Voice: a mix of male and female Azure voices (VOICE_GENDER=male or female to change), English always the clear slower and louder voice; back |
| 90 | 1.0.90| 2026-11-17 03:21| GKH-Project-Champ| `2ef0f51` | Lessons learned tab: living log, AI-suggested lessons from the project's history, a reusable library across projects (suggested per project, |
| 91 | 1.0.91| 2026-11-17 11:33| champ-review| `5ddbc40` | CodeRabbit AI review and the automated tests on every pull request into GKH-Project-Champ |
| 92 | 1.0.92| 2026-11-17 11:50| champ-review| `60764c0` | Lessons video: 45 seconds in five parts (what this is about, what went well, what didn't, our key recommendations, the key lessons), clean i |
| 93 | 1.0.93| 2026-11-17 12:03| champ-review| `2a01198` | Tests: steadier on GitHub's slower runners (longer PDF downloads, wait for the video length), Pillow for the colour check |
| 94 | 1.0.94| 2026-11-17 12:24| champ-review| `f7971b2` | Lessons video in the 5-part format (45s, no overlays), CodeRabbit review and CI tests |
| 95 | 1.0.95| 2026-11-17 13:31| champ-main| `5fe12b0` | Own repository: tests and CodeRabbit reviews run on pull requests into main (GKH-Project-Champ kept as well) |
| 96 | 1.0.96| 2026-11-17 14:01| champ-main| `1208651` | Share previews (LinkedIn, WhatsApp) and email links use gkhpmo.com; other deploy addresses are still swapped in at build time |
| 97 | 1.0.97| 2026-11-17 14:11| fix-video-review| `8d1ad8c` | Lessons video: no crash when a report section is empty or has no reuse lessons; Champ's narration is shortened and re-made until it fits 45  |
| 98 | 1.0.98| 2026-11-17 14:20| fix-video-review| `55f1b6a` | Lessons video runs 80 seconds: Champ says fuller points (headline and story, up to ~100 words), never cut off (narration is shortened and re |
| 99 | 1.0.99| 2026-11-17 14:34| fix-video-review| `d114fea` | Lessons video, CodeRabbit review: a part whose voice would not fit is drawn without it (never cut off), the saved video script is what was a |
| 100 | 1.0.100| 2026-11-17 14:39| fix-video-review| `4d4e745` | New project only from the left panel: removed the button from the top bar, the pipeline board, the program page and the empty portfolio |
| 101 | 1.0.101| 2026-11-17 14:48| fix-video-review| `acc36b9` | Lessons video 80 s, never cut off (CodeRabbit fixes); New project only from the left panel |
| 102 | 1.0.102| 2026-11-17 15:43| fix-topbar| `e0ade43` | Voice input waits until you finish; language and skin controls back in the console top bar |
| 103 | 1.0.103| 2026-11-17 15:51| ctl-gkhbar| `e136eb6` | Console: the language, light/dark and skin controls sit in the black GKH bar at the very top, just left of Powered by Global Knowledge House |
| 104 | 1.0.104| 2026-11-17 16:13| ctl-gkhbar| `7933be9` | The GKH bar is its own layer, so the skin button in it no longer sits above full-screen views (it blocked the lessons report's Word and vide |
| 105 | 1.0.105| 2026-11-17 16:33| ctl-gkhbar| `a0604ff` | Language, light/dark and skin controls at the very top of the console (GKH bar) |
| 106 | 1.0.106| 2026-11-17 17:04| finished-verdict| `6fa78ec` | Finished projects: Champ gives the verdict (succeeded, partly succeeded or failed: time against the baseline, cost against the approved budg |
| 107 | 1.0.107| 2026-11-17 17:24| finished-verdict| `6b29b53` | Finished projects (CodeRabbit review): the actual finish comes from when the work was done, days on the project's own calendar, finished onl |
| 108 | 1.0.108| 2026-11-17 18:02| finished-verdict| `1ba6ec5` | Finished projects: verdict, time index and CPI, and Champ's post-mortem |
| 109 | 1.0.109| 2026-11-17 19:19| ctl-back| `116aa82` | Language, light/dark and skin controls back on the right of the console header, which stays on screen when you scroll; the Projects list no  |
| 110 | 1.0.110| 2026-11-17 19:44| ctl-back| `1d29d7e` | Top controls back in the header (stay on screen); New project only in the left panel |
| 111 | 1.0.111| 2026-11-17 19:58| spi-finished| `8cee112` | Finished projects show their time index and how many days late they finished, in the Projects list (time column), the program's lowest figur |
| 112 | 1.0.112| 2026-11-17 20:23| spi-finished| `5ce8f03` | Finished projects: time index and days late instead of SPI 1.00 |
| 113 | 1.0.113| 2026-11-18 09:17| lessons-video| `3682dfd` | Lessons video: 90 seconds in the launch-film style; no Champ button on the sign-in screen |
| 114 | 1.0.114| 2026-11-18 09:26| lessons-video| `7b3cbce` | Test: the lessons video runs 90 seconds (89.5 to 90.5) |
| 115 | 1.0.115| 2026-11-18 09:42| lessons-video| `ea3cf60` | Gantt: + sub-task always shows; indent/outdent by level; steps get Who, reminder, delete; people and @ mentions from the Stakeholder registe |
| 116 | 1.0.116| 2026-11-18 10:02| lessons-video| `16556de` | Gantt levels: refuse moves past the saved limits or into a dependency loop; keep owner, description, priority and points across levels; serv |
| 117 | 1.0.117| 2026-11-18 10:12| lessons-video| `8991047` | Lessons video 90 s; no Champ on sign-in; Gantt levels and stakeholder-only people (#7) |
| 118 | 1.0.118| 2026-11-18 17:01| gantt-full| `fdb894b` | Full-screen Gantt editor with a toolbar (levels, indent/outdent, bold/italic/underline, colours, expand/collapse, find); @ list shows beside |
| 119 | 1.0.119| 2026-11-18 17:15| gantt-full| `c01cf31` | Full screen: Step opens a collapsed task first; formatting moves with indent/outdent; leaving for WBS or another tab ends full screen; test  |
| 120 | 1.0.120| 2026-11-18 17:25| gantt-full| `12c24da` | Full-screen Gantt editor; @ list on top of the note (#8) |
| 121 | 1.0.121| 2026-11-18 18:06| gantt-perf| `526f9dc` | Full screen: dialogs, messages and pop-ups show over it (layer 39); grid row heights in one layout pass (350 ms to 18 ms on a 100-row plan); |
| 122 | 1.0.122| 2026-11-18 18:16| gantt-perf| `b363ff3` | Full screen: dialogs on top; faster grid (#9) |
| 123 | 1.0.123| 2026-11-18 18:41| at-list| `e1a193b` | Sticky notes: @ lists every stakeholder with a phone or email (not just the first 8), scrolling, tall as the screen allows |
| 124 | 1.0.124| 2026-11-18 18:58| at-list| `fc9f650` | @ list: an email address can be typed after @; the contact shown is trimmed; test scrolls to a name below the fold and picks it |
| 125 | 1.0.125| 2026-11-18 19:22| at-list| `7036190` | Website: the 2-minute film on the home page (promo.html, drawn live so it plays in the visitor's language); About: Sashi's photo, bigger nam |
| 126 | 1.0.126| 2026-11-18 19:22| at-list| `5ee593d` | All pages load the new site stylesheet (v7) |
| 127 | 1.0.127| 2026-11-18 19:47| at-list| `17ac100` | Film player: starts at 0:00; carries on silently if the audio fails, stalls or cannot seek; one animation loop; controls keyboard-reachable  |
| 128 | 1.0.128| 2026-11-18 20:01| at-list| `3f3f9c4` | @ list fixes; the 2-minute film on the home page; About profile update (#10) |
| 129 | 1.0.129| 2026-11-18 20:44| photo-blue| `478a059` | About: Sashi's photo on an elegant dark-blue backdrop (background only replaced) |
| 130 | 1.0.130| 2026-11-18 20:55| photo-blue| `6f15856` | About: Sashi on a slowly moving galaxy (stars, nebulae, a turning spiral galaxy, a shooting star now and then, AI / tech / project symbols d |
| 131 | 1.0.131| 2026-11-18 21:08| photo-blue| `f7284e9` | Galaxy: no 2D context skips it; reduced motion respected while reading; runs only on screen and in a visible tab; dust colours worked out on |
| 132 | 1.0.132| 2026-11-18 21:23| photo-blue| `31c00db` | Galaxy: travelling through space (stars stream out towards the viewer with trails, the AI / tech / project symbols fly out of the deep), a s |
| 133 | 1.0.133| 2026-11-18 21:39| photo-blue| `09da93c` | Fit: baseline dates only from tasks that still have a row; focus stays on the switch; test adds 40 Sydney calendar days |
| 134 | 1.0.134| 2026-11-18 22:18| gantt-fit2| `1202f5a` | Fit: the chart opens at the plan when fitted, and starts there again whenever its first date changes; test checks the first date and that th |
| 135 | 1.0.135| 2026-11-18 22:25| gantt-fit2| `4454e80` | Fit: the chart also opens at the plan again when the plan start moves (even with an earlier baseline), and a redraw does not put the old pos |
| 136 | 1.0.136| 2026-11-18 22:34| gantt-fit2| `a826caf` | Console: the microphone check loads before Champ's guide |
| 137 | 1.0.137| 2026-11-18 23:05| mic-eye| `7d86f2d` | About: Sashi's profile rewritten around Program, Project and AI (pioneer bridging AI into project management), with a Talk to Sashi button |
| 138 | 1.0.138| 2026-11-18 23:29| bio| `7b8d20d` | About: profile rewritten around Program, Project and AI (#15) |
| 139 | 1.0.139| 2026-11-19 00:35| bio2| `c0bb589` | About: AI pioneer opening line kept, original profile paragraphs back, five continents in passing, the three areas, key projects |
| 140 | 1.0.140| 2026-11-19 00:49| bio2| `33f8045` | Test: the About page's three areas and key projects are checked by name |
| 141 | 1.0.141| 2026-11-19 00:58| bio2| `f653c74` | Film and its transcript end with: Architected by Sashi Kumar Sivam, a pioneer in bringing AI into program and project management |
| 142 | 1.0.142| 2026-11-19 01:06| bio2| `930bda2` | The globe on the Ask Champ button spins faster as the alert rises: green slow, amber medium, red fast (still for reduced motion) |
| 143 | 1.0.143| 2026-11-19 01:26| globe-speed| `25cda60` | Merge main |
| 144 | 1.0.144| 2026-11-19 01:48| globe-speed| `8c54220` | Test: each status's globe animation is checked by name, state and speed |
| 145 | 1.0.145| 2026-11-19 02:01| globe-speed| `8e6b449` | Ask Champ: the globe spins faster as the alert rises (#17) |
| 146 | 1.0.146| 2026-11-19 09:30| help-centre| `ff478e3` | Help centre: an article for every feature and its parts, on the website, in the console, and in Champ's answers |
| 147 | 1.0.147| 2026-11-19 09:49| help-centre| `21e1161` | Help review fixes: root Help link on 404, late loads never replace the screen or a closed panel, search text decoded once, ? reports load er |
| 148 | 1.0.148| 2026-11-19 10:07| help-centre| `e876128` | Help centre: every feature and its parts, on the website, in the console and in Champ's answers (#18) |
| 149 | 1.0.149| 2026-11-19 20:51| rw-speech| `dfe9e14` | Kinyarwanda: text only, no voice and no mic (no speech service speaks or hears it yet) |
| 150 | 1.0.150| 2026-11-19 21:18| rw-speech| `f81ea10` | Kinyarwanda: text only (no voice, no mic) (#19) |
| 151 | 1.0.151| 2026-11-19 22:15| start-screen| `e0401b7` | 🎯 Today: the start screen after sign-in (Lean flow): my work and my blockers |
| 152 | 1.0.152| 2026-11-19 22:39| start-screen| `c5f951c` | Today review fixes: exact name match, due within the week, fresh lists after a tick, no reopen after closing, closed screens ignore errors,  |
| 153 | 1.0.153| 2026-11-19 23:05| start-screen| `827eb6d` | Test: the console menu starts with 🎯 Today (its red count left out) |
| 154 | 1.0.154| 2026-11-19 23:05| start-screen| `1d861c0` | 🎯 Today: the start screen after sign-in (your work and your blockers) (#20) |
| 155 | 1.0.155| 2026-11-19 23:33| ci-fast| `b9cfd90` | CI: a quick check on every pull request (about 2 minutes); the full suite every night at 12 am Sydney and on demand (#21) |
| 156 | 1.0.156| 2026-11-19 23:55| today-names| `fb43fa9` | Today knows you by your full name and email: middle names, @mentions in your own notes, the super user's OWNER_EMAIL (#22) |
| 157 | 1.0.157| 2026-11-20 00:08| today-due| `3c7dbc9` | Today: notes count in "due today or tomorrow" and "overdue"; DUE TODAY flashes red, DUE TOMORROW amber; no WIP count (#23) |
| 158 | 1.0.158| 2026-11-20 00:15| board-owner| `a488f17` | Kanban / Scrum owner follows the Gantt: no board owner shows the ★ lead; picking an owner makes them the ★ lead; Today counts board owners ( |
| 159 | 1.0.159| 2026-11-20 00:34| note-tags| `dd27adc` | #Tags in sticky notes: blocker, issue, decision, waiting, action, risk, idea, fyi (#25) |
| 160 | 1.0.160| 2026-11-20 00:37| note-save| `cdb6a09` | Sticky notes: a clear 💾 Save note / 💾 Save button and ✓ Saved after each save (#26) |
| 161 | 1.0.161| 2026-11-20 00:48| today-open| `7726e96` | Today → Open: no detour through Portfolio (the cause of "Cannot set properties of null (setting 'innerHTML')"); errors from a page you have  |
| 162 | 1.0.162| 2026-11-20 00:52| today-open| `be87f0a` | Review: errors on the page you are on always show; a refused page also cancels the old page's errors |
| 163 | 1.0.163| 2026-11-20 00:59| today-open| `fdb7b1a` | Review: a slow plan load never replaces a newer page (load sequence) |
| 164 | 1.0.164| 2026-11-20 01:06| today-open| `c0ab6cc` | Review: same-plan tab changes keep the load; leaving the plan drops it; a late quote update never redraws a page you left |
| 165 | 1.0.165| 2026-11-20 01:13| today-open| `c49aaea` | Today → Open: fix 'Cannot set properties of null (setting innerHTML)' (#27) |
| 166 | 1.0.166| 2026-11-20 02:02| postgres| `e016d87` | Data: Postgres behind one switch (CHAMP_DB), faster loading, and an owner-only move between Blobs and Postgres |
| 167 | 1.0.167| 2026-11-20 02:14| postgres| `93bbccf` | Data: Postgres behind one switch (CHAMP_DB), faster loading, owner-only move (#28) |
| 168 | 1.0.168| 2026-11-20 11:01| today-week| `d515f2a` | Today: one work week at a time, and no ✓ Done / ✓ Resolved (open it and deal with it there) |
| 169 | 1.0.169| 2026-11-20 11:08| today-week| `4e41327` | Review: the work week starts on the next working day (weekends see Mon–Fri) |
| 170 | 1.0.170| 2026-11-20 11:15| today-week| `d3815a8` | Today: one work week at a time; Open only (#30) |
| 171 | 1.0.171| 2026-11-20 11:36| work-calendar| `d23b44b` | 📍 Location: each project follows its place's weekend and public holidays |
| 172 | 1.0.172| 2026-11-20 11:49| work-calendar| `0d328d6` | Review: one holiday per date (yours wins), Cancel and older searches never apply, Save waits for the later years, the add row wraps on phone |
| 173 | 1.0.173| 2026-11-20 11:59| work-calendar| `db7aab0` | 📍 Location: weekends and public holidays by place (#31) |
| 174 | 1.0.174| 2026-11-20 12:01| free-view| `11e805b` | Website: free to explore with Google sign-in (view-only, no payment, no credit card), under the hero and on the login page (#32) |
| 175 | 1.0.175| 2026-11-20 12:35| hol-allowed| `30e6623` | 📅 Public holidays allowed (off by default) re-plans the work; Weekends allowed says the new finish; full screen keeps the calendar row (wee |
| 176 | 1.0.176| 2026-11-20 13:12| cal-tidy| `b589462` | 📱 Phone edition: detects the phone and OS; landing page (intro, what Champ is, the film, language, big Login); after sign-in only Today, li |
| 177 | 1.0.177| 2026-11-20 14:27| stk-only| `781d76a` | 📞 Call numbers from the project's stakeholder list only (no People fallback) (#37) |
| 178 | 1.0.178| 2026-11-20 14:33| todo-tidy| `108c6ca` | 📱 Today on the phone: tidy full-width cards; tasks as compact rows (title, how late, project, progress bar, smaller buttons) (#38) |
| 179 | 1.0.179| 2026-11-20 14:36| auto-raid| `77927c1` | #risk / #issue notes go into the risk register / issue log by themselves when saved (new or edited), once each (#39) |
| 180 | 1.0.180| 2026-11-20 14:58| remind| `6bdbd5a` | 📱 ⏰ Remind me on the phone: any Today item into Apple Calendar / the phone calendar (calendar file with an alert) or Google Calendar, at a  |
| 181 | 1.0.181| 2026-11-20 15:39| speed| `af36df0` | Speed: the console's scripts and styles are cached by the browser (they carry a version), instead of no-store on every load; the console pag |
| 182 | 1.0.182| 2026-11-20 22:44| ceo| `d8fee94` | 👔 CEO view (Persona, stage 1): one CEO per company in Users & access; the CEO lands on how every project is doing (worst first, why, SPI/CP |
| 183 | 1.0.183| 2026-11-20 23:24| ceo2| `2612f04` | 👔 CEO view: a legend for the program health counts (and hover text); revenue says 'not tracked yet' instead of $0 when no quotes or invoice |
| 184 | 1.0.184| 2026-11-20 23:30| finance| `eb79780` | 💵 Finance: milestone billing (contract value + each milestone's share; a done milestone is ready to invoice; raise it once), every invoice  |
| 185 | 1.0.185| 2026-11-20 23:36| brief| `ed7c9e4` | 🎙 Champ's CEO briefing (overview, concerns, quick wins, cash view, strategy and road ahead; verdict by rules: turnaround / steady and stren |
| 186 | 1.0.186| 2026-11-20 23:44| vault| `032b30a` | 🔒 Finance vault: Program → Project → Contracts / Billing / Invoices / Documents; opens for the super user, CEO, CFO and the program directo |
| 187 | 1.0.187| 2026-11-20 23:47| brief2| `edca87c` | 🎙 CEO briefing in the CEO's order: how we are faring, concerned / happy about, recommended turnaround or winning strategy, focus, cash flow |
| 188 | 1.0.188| 2026-11-20 23:52| ask2| `2d1519c` | 🧭 Ask Champ on the CEO view answers project questions (customer, project manager, owner/sponsor, program director, stakeholders, dates, sta |
| 189 | 1.0.189| 2026-11-20 23:54| champ-rag| `fcd38ad` | 🔎 Ask Champ on the CEO view: plain Champ again (no 'strategy adviser'), in control of the whole project environment: RAG over every project |
| 190 | 1.0.190| 2026-11-20 23:56| read-all| `20a5a5a` | 🔊 Ask Champ on the CEO view reads the whole answer aloud (answer, each option with upside and downside, the decision, what to track); overv |
| 191 | 1.0.191| 2026-11-20 23:58| greet| `7015ded` | 🎙 Champ says a few words when the CEO view opens (greeting, the headline, cash, where to start); at most once every 10 minutes (#52) |
| 192 | 1.0.192| 2026-11-21 00:11| ask-fix| `8e11912` | 🧭 Ask Champ (CEO view): follow-up questions no longer break: the conversation goes in as notes, and a plain-words answer is shown instead o |
| 193 | 1.0.193| 2026-11-21 00:15| champ-btn| `25ec23a` | 👔 CEO view: Champ's button in the same globe-and-colour format (act now / watch / on track, from the portfolio's verdict); Champ folds back |
| 194 | 1.0.194| 2026-11-21 11:19| vault-lib| `7d6c333` | 🔒 Finance vault as a document library: one search box (name, project, program, client, words inside with the matching passage), quick filte |
| 195 | 1.0.195| 2026-11-21 11:22| plans-search| `6db3173` | 📁 Projects list: find a project as you type (name, reference, client, program), filters (All, Behind, Not planned yet), projects not planne |
| 196 | 1.0.196| 2026-11-21 11:34| bill-panel| `a3cd478` | 💵 Billing: one money panel (contract, GST, budget with contingency and reserve, forecast cost, margin, profit); milestone due dates in colo |
| 197 | 1.0.197| 2026-11-21 11:38| deliverables| `47cec0c` | 🏁 Project documents: a Deliverables folder (final and interim deliverables, Draft or Final; masterplans, blueprints and reports file themse |
| 198 | 1.0.198| 2026-11-21 11:42| pause| `2bb716b` | 🎙 CEO briefing: ▾ Hide / ▸ Show (remembered), 📄 Download PDF (a one-page note), ⏸ Pause / ▶ Carry on while it reads; Champ's panel gets ⏸  |
| 199 | 1.0.199| 2026-11-21 11:54| billfix| `197bdca` | 💵 Finance: every project shows where it stands on billing; no contract yet = an estimate from Costing (split evenly across milestones) unti |
| 200 | 1.0.200| 2026-11-21 11:59| budgetwhy| `53cfdac` | 🧮 Finance: show how the budget and the estimated contract are worked out (costed work + contingency + reserve = budget, + margin), and how  |
| 201 | 1.0.201| 2026-11-21 12:01| bacnote| `c85942e` | 🧮 Finance: Budget = Base cost (BAC) + contingency + reserve, with a link to the plan's Costing (#62) |
| 202 | 1.0.202| 2026-11-21 12:24| variation| `8c809e7` | 📝 Finance: variation orders (raised to the PM and program director, approved by the program director, recorded in Change control); contract |
| 203 | 1.0.203| 2026-11-21 12:45| modalx| `7b4939d` | 🪟 Pop-ups stay open until closed: every pop-up gets a ✕; a click outside no longer shuts them (pop-ups, Today, the sticky-notes panel, phon |
| 204 | 1.0.204| 2026-11-21 12:54| fcnote| `09f2ead` | 💵 Finance: forecast cost explained (BAC ÷ CPI, what CPI and SPI mean, earned vs spent); Project budget with the charter approved budget and |
| 205 | 1.0.205| 2026-11-21 15:16| delunplanned| `76c4805` | 🗑 Projects: a Delete button on every project not planned yet (same confirm, edit access to Projects) (#66) |
| 206 | 1.0.206| 2026-11-21 15:24| archive| `b78f3fc` | 🗄 Archived projects vault: planned projects over a week old can only be deleted by the super user; others are archived (super user, CEO, si |
| 207 | 1.0.207| 2026-11-21 15:27| nodelete| `23b1c6d` | 🔒 A planned project over a week old can't be deleted by anyone (super user too): archive it; for now the super user can delete from the Arc |
| 208 | 1.0.208| 2026-11-21 16:07| agefix| `d8e16aa` | 🔒 Project age for deleting = the earlier of the record's creation and the project start date (a project started in April can't be deleted,  |
| 209 | 1.0.209| 2026-11-21 16:23| profitfix| `1ed2626` | 💹 Money audit: one set of numbers everywhere (#70) |
| 210 | 1.0.210| 2026-11-21 16:27| finsearch| `88ebf1e` | 🔎 Finance: search projects by name, client, reference or program; filter by program and by status (click the counts) (#71) |
| 211 | 1.0.211| 2026-11-21 16:40| ctype| `ef8dfcf` | 📜 Contract type on Costing (fixed price by default; cost-plus; target cost with gain/pain share; GMP with shared savings), one profit calcu |
| 212 | 1.0.212| 2026-11-21 16:47| internal| `95d8c76` | 🏢 Internal projects (no billing): a contract type for a department's own project; no contract value, GST, invoices, variation orders or pro |
| 213 | 1.0.213| 2026-11-21 17:46| cpibasis| `5d95460` | 🔎 CPI on a clear basis: labour and services vs materials (BOM); forecast by cost element; time index for finished projects; ⓘ basis behind  |
| 214 | 1.0.214| 2026-11-21 17:53| bomfixed| `2e5424b` | 🧱 The BOM is held at its baselined price; CPI and SPI measure labour and services; actual costs captured at every milestone (#75) |
| 215 | 1.0.215| 2026-11-21 17:57| evcheck| `ad22dbb` | 💲 Check-in confirms progress and cost together: % done (EV) and actual cost to date (AC) per task, at each milestone and from Overview; bot |
| 216 | 1.0.216| 2026-11-21 18:08| champdrag| `70dff33` | ✋ Move Champ anywhere: drag the button (remembered), the panel opens beside it, double-click puts it back; 'Total budget' renamed Project bu |
| 217 | 1.0.217| 2026-11-21 18:10| ciwide| `532352d` | 💲 Check-in box: wide (up to 1100px), full task names, short headings, scrolling list with a sticky header, the save button always in view ( |
| 218 | 1.0.218| 2026-11-21 18:16| spidays| `37acd43` | ⏱ SPI in days (earned schedule): behind or ahead by N working days, the date the work done was planned for, and the finish slip against the  |
| 219 | 1.0.219| 2026-11-21 18:25| champfit| `500db4f` | 📐 Champ's panel always fits on screen wherever the button is (opens on the side with more room, height capped with the conversation scrolli |
| 220 | 1.0.220| 2026-11-21 18:38| costgrid| `571d2f7` | 💲 Record actual costs on the Gantt chart itself: full screen in the $ Costs view, Actual $ and % highlighted, a banner with Done, scrolled  |
| 221 | 1.0.221| 2026-11-21 18:49| bomver| `0e19100` | BOM versions: v0 baseline, v1… revisions filed in Project documents, summarised for PM/CFO/CEO, recorded in Lessons learned; materials CPI f |
| 222 | 1.0.222| 2026-11-21 18:56| bomgantt| `604b562` | Gantt: BOM milestone shows its version (vN, date and time, total, change), markers on the chart and a BOM versions list (#83) |
| 223 | 1.0.223| 2026-11-21 19:32| bomall| `7f6c870` | BOM: tick (or untick) every line shown in one go from the ✓ header (#84) |
| 224 | 1.0.224| 2026-11-21 19:48| smallscreen| `a8e548a` | Fit small laptops: compact layout under 800px high or 1400px wide, Gantt sized to the screen, drag-to-resize Gantt height, dates & calendar  |
| 225 | 1.0.225| 2026-11-21 19:51| depfit| `6bedd25` | Dependency board fits laptops: timeline squeezes to the width, narrower names column, names stay above bars, redrawn on resize (#86) |
| 226 | 1.0.226| 2026-11-21 19:52| tdyfade| `5fad13e` | Today: quick smooth fade in and out (no unroll, flying rows or fly-out) (#87) |
| 227 | 1.0.227| 2026-11-21 19:57| fitmode| `99acbc7` | Header layout switch: Auto / Compact / Full (#88) |
| 228 | 1.0.228| 2026-11-21 20:02| fit2| `ffc255f` | Layout switch: Auto and Compact only (#89) |
| 229 | 1.0.229| 2026-11-21 20:12| fitzoom| `6c7bf31` | Gantt: panes scroll together reliably (wheel/touch pad), a ⤒▲ slider ▼⤓ rail, Excel-style arrow and Enter keys; Screen fit panel with detect |
| 230 | 1.0.230| 2026-11-22 01:16| gantt3| `a822878` | Gantt: ▦ Columns to hide grid columns, chart follows the bars as you scroll down, BOM rows take their actual cost from the BOM and price cha |
| 231 | 1.0.231| 2026-11-22 01:25| bomcc| `a40ffc3` | BOM / BOQ: named Bill of Materials and Quantities, every version also as a PDF, sign-off and price changes go through change control (unless |
| 232 | 1.0.232| 2026-11-22 01:30| evmfix| `1bb2ae8` | EVM panel shows what SPI and CPI are made of; money typed above the BOM price counts in CPI (#93) |
| 233 | 1.0.233| 2026-11-22 01:36| orders| `6b8e6fa` | Order status replaces Things to order: status per order, price and lead-time changes re-baseline the BOM and the Gantt (critical path) throu |
| 234 | 1.0.234| 2026-11-22 01:40| colbtn| `e3911f2` | Gantt view bar: 👁 Hide columns (with a hidden count), WBS at the far right; recording bar wording for BOM rows (#95) |
| 235 | 1.0.235| 2026-11-22 01:49| ccorder| `e3b0681` | Overview: top risks and open issues on the left, redesigned; order price and lead-time changes go straight to change control with a scope, t |
| 236 | 1.0.236| 2026-11-22 01:51| ordstrike| `0902b92` | Order status: ordered items struck off in the style of their status; Not ordered stays plain (#97) |
| 237 | 1.0.237| 2026-11-22 01:53| colpanel| `cf98523` | Hide columns panel: a tidy two-column, left-aligned list (#98) |
| 238 | 1.0.238| 2026-11-22 01:58| bomact| `491f2b9` | BOM-only rows: actual cost is the BOM / BOQ (× % done), one plain line; typed figures no longer used (#99) |
| 239 | 1.0.239| 2026-11-22 02:02| scrollfix| `fc05664` | Gantt scrolling: panes stay in step under touch-pad momentum and crossing the divider; the chart follows the bars only once scrolling has st |
| 240 | 1.0.240| 2026-11-22 02:17| fincons| `03832dd` | One set of figures: billing's work done is the plan's % complete, not billed = milestones done; the CEO view shows Finance's profit on the e |
| 241 | 1.0.241| 2026-11-22 02:19| bomgo| `8d943d1` | Gantt: the BOM row's Actual $ opens the BOM / BOQ directly (no price pop-up) (#102) |
| 242 | 1.0.242| 2026-11-22 02:26| consist| `c0bdde7` | One set of figures for every project: BOM-only actuals read from the BOM at every calculation (no save needed), the plan's budget and foreca |
| 243 | 1.0.243| 2026-11-22 02:36| ovorder| `5ecea31` | Overview: left column is Time & cost, Late tasks, This week, Top risks, Open issues; late tasks redesigned (#104) |
| 244 | 1.0.244| 2026-11-22 02:55| spifix| `0c0b327` | Never re-baseline automatically: order changes never move delivered materials or started work, keep the order date, and never touch the base |
| 245 | 1.0.245| 2026-11-22 03:02| basever| `bdfd860` | Baseline versions: v0 and every re-baseline kept, filed as PowerPoint and CSV in Project documents; re-baseline and roll back through change |
| 246 | 1.0.246| 2026-11-22 03:22| crbase| `216a40f` | Baselines: the version is recorded at once and also on read (self-healing), its files are made in their own retried step with the result sho |
| 247 | 1.0.247| 2026-11-22 03:27| basepdf| `599b769` | Baselines: each version filed as a PDF (and a spreadsheet), not PowerPoint; pptxgenjs removed (#108) |
| 248 | 1.0.248| 2026-11-22 03:29| basenames| `21aa198` | Baselines: every version is its own document, Project Baseline vN (PDF and spreadsheet), all listed for audit (#109) |
| 249 | 1.0.249| 2026-11-22 03:44| aiprofit| `14d1a29` | AI query: projects carry the CEO view's profit, contract value (and whether it is an estimate), approved budget and cost vs budget, with not |
| 250 | 1.0.250| 2026-11-22 03:52| sqlnames| `7a34266` | Reports: results show names, not IDs (ID columns hidden when a name is there, kept in the CSV), charts labelled by project name, and the AI  |
| 251 | 1.0.251| 2026-11-22 03:55| aidelay| `3233806` | AI query: projects carry delayed_days (past the baseline, or the forecast past the planned finish) as the CEO view, with notes never to read |
| 252 | 1.0.252| 2026-11-22 04:00| tmpl| `2947d21` | Reports: common reports rewritten for Project Champ (portfolio, schedule, money, risks and issues, change control, people) with project name |
| 253 | 1.0.253| 2026-11-22 04:03| aibill| `0e1156c` | AI query: billed / invoiced projects and projects past their billing dates (as Finance shows); Billed projects and Past their billing dates  |
| 254 | 1.0.254| 2026-11-22 04:09| aiview| `d1449b8` | Reports open in the AI query view (answer in words, chart/table below, query folded); billing date = the agreed (baseline) milestone date so |
| 255 | 1.0.255| 2026-11-22 09:51| aipm| `be8b85e` | AI query: project_manager and project_sponsor on projects (as the CEO view); every report fills the question box with its plain question (#1 |
| 256 | 1.0.256| 2026-11-22 10:10| bimin| `062860d` | BIM and construction files in Start from a document (IFC take-off, TimeLiner, MS Project XML, clash reports, DXF; Revit/Navisworks/AutoCAD k |
| 257 | 1.0.257| 2026-11-22 10:43| bimsample| `b1060ac` | Sample BIM set (imaginary Riverbend Allied Health Hub: IFC, TimeLiner, clash report) with a Try a sample link; rooms grouped by type; layere |
| 258 | 1.0.258| 2026-11-22 10:45| nohelp| `309f7be` | Website: Help removed (nav, footer, page); /help goes to the home page; help stays in the console (#119) |
| 259 | 1.0.259| 2026-11-22 11:05| bimfix| `af138de` | Sample IFC with real geometry (validated, viewable in any IFC viewer); a document started from several files keeps the first file's name and |
| 260 | 1.0.260| 2026-11-22 11:11| mobile| `e431755` | Phone website: menu (Home, About with Sashi, Who it's for, Contact), short sections, language in the menu (all languages), best-on-a-compute |
| 261 | 1.0.261| 2026-11-22 11:18| mobile| `5c235bc` | Phone website remodel: short sections, menu, languages, desktop note (#122) |
| 262 | 1.0.262| 2026-11-22 11:34| phoneonly| `42d618d` | Phones always get the phone website: no Full website switch, stored opt-outs cleared, other website pages open their short section on the ph |
| 263 | 1.0.263| 2026-11-22 11:40| phonedesign| `e6968ca` | Phone website redesigned: warm graphite and gold, Archivo and Manrope, a live plan in the hero that draws itself, founder portrait and quote |
| 264 | 1.0.264| 2026-11-22 11:51| phonepolish| `0f125e9` | Phone website: how it works in three steps, WhatsApp opens with a message, the phone's top bar matches the page, press feedback (#125) |
| 265 | 1.0.265| 2026-11-22 11:53| gkhlink| `f924f0d` | Phone website: link to the GKH website in About (#126) |
| 266 | 1.0.266| 2026-11-22 12:05| sashiphoto| `1fc031c` | Phone website: smaller founder portrait on a studio backdrop, beside the name (#127) |
| 267 | 1.0.267| 2026-11-22 12:08| sashioffice| `3bb5491` | Phone website: founder portrait on a blurred modern office backdrop (#128) |
| 268 | 1.0.268| 2026-11-22 12:27| phonepolish2| `2bf6905` | Phone website polish: month axis and status dots on the plan, selected national programs strip, a quiet sign-off (#129) |
| 269 | 1.0.269| 2026-11-22 12:29| ifcview| `ab844c7` | Documents: 🧊 3D on IFC models opens the free Sortdesk IFC Viewer and downloads the model to drop in (it stays on the computer) (#130) |
| 270 | 1.0.270| 2026-11-22 13:07| msbill| `ed5629e` | Milestone billing on the Gantt (bill icon: yet to invoice, ready, invoiced, part paid, overdue, collected; hover detail; click to the billin |
| 271 | 1.0.271| 2026-11-22 13:23| aimoney| `5dcebb8` | No money for contractors and project personnel in Ask AI and documents: the AI gets no costs and is told not to discuss them; money document |
| 272 | 1.0.272| 2026-11-22 13:51| paudit| `8022580` | Project audit trail (every change: when, who, role, IP, what, before and after; SHA-256 hash chain; PDF and CSV from Project documents); the |
| 273 | 1.0.273| 2026-11-22 15:01| heroscenes| `65d9dc0` | Phone website: the hero shows five scenes in turn (plan, board, from a document, cost, billing), each fading into the next; dots and swipe t |
| 274 | 1.0.274| 2026-11-22 15:10| hero8| `eecc5ae` | Phone website hero: eight scenes across project types (ERP rollout, banking app, clean water, hospital fit-out, ESG strategy, solar mini-gri |
| 275 | 1.0.275| 2026-11-22 15:22| tabs1row| `8d5ca8f` | Project menu: one line of coloured icon tiles grouped as Plan, Control, Money, Records (#136) |
| 276 | 1.0.276| 2026-11-22 15:41| billvis| `9bd2f4d` | Billing: a project director sees billing on programs with no director yet (milestone bill on the Gantt was hidden) (#137) |
| 277 | 1.0.277| 2026-11-22 15:53| pmodir| `d5a6ea4` | PMO Director persona: one per company, the PMO view dashboard, menu and permissions (#138) |
| 278 | 1.0.278| 2026-11-22 15:56| askclean| `8bee8a3` | Ask AI: one menu entry (Reports & data removed), tables list only on Wizard and SQL editor, Sashi's photo by the title (#139) |
| 279 | 1.0.279| 2026-11-22 16:03| askname| `6d15d95` | Menu: Ask AI is now Ask AI & reports (#140) |
| 280 | 1.0.280| 2026-11-22 16:06| askface| `6c81a1a` | Ask AI & reports: Sashi's portrait (cream studio) beside the title (#141) |
| 281 | 1.0.281| 2026-11-23 01:21| feathero| `27c4faa` | Features page: a ten-scene stage (overview, Gantt, board, from a document, earned value, risks, change control, billing, programs, any langu |
| 282 | 1.0.282| 2026-11-23 01:26| featbim| `a2cf3d5` | Features page: BIM scene, from the model to the plan (eleven scenes) (#143) |
| 283 | 1.0.283| 2026-11-23 01:43| progmgr| `85b0a48` | Program manager persona: their programs only (projects, people, Ask AI), the Program view, People > Program managers, and the role in Users  |
| 284 | 1.0.284| 2026-11-23 02:35| roles2| `e4090f2` | Roles: Project director becomes PMO Director (several allowed); Project managers see only their projects; People Role follows the login; Job |
| 285 | 1.0.285| 2026-11-23 02:41| pgcols| `7c0b2ea` | Users & access: Programs and Projects checklists in columns (three where they fit) (#146) |
| 286 | 1.0.286| 2026-11-23 02:47| featai| `debaf66` | Features: The power of AI (a working day with Champ, and what stays with people); the risk scene shows Champ raising the risk, on desktop an |
| 287 | 1.0.287| 2026-11-23 03:23| crfix| `2667f30` | Security and access fixes from CodeRabbit's review (logins, Ask AI money and scope, meeting analysis, health check), plus dashboard and caro |
| 288 | 1.0.288| 2026-11-23 03:37| crfix| `d1e9f1f` | CodeRabbit round 2: staged documents only for their uploader, money-free meeting analysis kept apart and amounts removed, shared logins, lin |
| 289 | 1.0.289| 2026-11-23 03:48| crfix| `255b976` | CodeRabbit round 3: amounts in words and with currency codes removed for money-free meeting analysis, latest dashboard request wins, full up |
| 290 | 1.0.290| 2026-11-23 03:59| crfix| `989c1b1` | Fixes from CodeRabbit's review of PRs #100–#147 (#149) |
| 291 | 1.0.291| 2026-11-23 12:17| newprog| `17a9bc7` | New project: choose a program or create a new one, both up front (no scrolling to the end of a list) |
| 292 | 1.0.292| 2026-11-23 12:23| newprog| `0af5472` | New project: Site or location is a type-ahead (town, suburb or postcode) that fills in the state, postcode and country, kept with the projec |
| 293 | 1.0.293| 2026-11-23 12:25| newprog| `5e97a62` | New project: choose a program or create a new one (#150) |
| 294 | 1.0.294| 2026-11-23 16:49| pmrole| `f1da493` | Scrum Master and Product Owner personas: project-level like a Project manager; delivery leads see Billing for their own client projects and  |
| 295 | 1.0.295| 2026-11-23 16:59| pmrole| `8cdb2a1` | CodeRabbit fixes: leads open PDFs of their own invoices only; no Open billing on internal projects; Google delivery leads get their projects |
| 296 | 1.0.296| 2026-11-23 17:30| pmrole| `7c13973` | Users & access: the confirm step says Scrum Masters and Product Owners get only the projects ticked |
| 297 | 1.0.297| 2026-11-23 17:36| pmrole| `df448a3` | Users & access: changing a module keeps a delivery lead's or program manager's role (and so their projects and billing); project names escap |
| 298 | 1.0.298| 2026-11-23 17:43| pmrole| `dfc604e` | Users & access: only the super user keeps the role when changing a module (others go to Custom, which the server checks) |
| 299 | 1.0.299| 2026-11-23 17:50| pmrole| `75f29ce` | Scrum Master and Product Owner personas; delivery leads raise invoices on their own client projects (#151) |
| 300 | 1.0.300| 2026-11-23 18:21| raid| `7cb86de` | RAID log: a project tab (four quadrants, one register, heat map, due soon, assumptions and outside dependencies, assumption to risk, AI find |
| 301 | 1.0.301| 2026-11-23 18:31| raid| `30c5da4` | RAID log, CodeRabbit fixes: title escaped in the delete confirmation; a failed assumption stays open until it has a risk; links retried afte |
| 302 | 1.0.302| 2026-11-23 18:38| raid| `3682fce` | RAID log: project tab and Portfolio › RAID log (#152) |
| 303 | 1.0.303| 2026-11-23 22:05| raidsug| `e7d23c0` | RAID log: AI suggestions grouped by type in tidy cards (checkbox, title, measure and date, detail, why), tick all or none, count of ticked i |
| 304 | 1.0.304| 2026-11-23 22:09| raidsug| `f34fc7d` | RAID log: tidy AI suggestions (#153) |
| 305 | 1.0.305| 2026-11-24 02:28| raidai| `c068197` | RAID log matches the Risk and Issue logs (same numbers, log order by default, same fields incl. issue Raised); Ask AI gives 3 possible solut |
| 306 | 1.0.306| 2026-11-24 02:33| raidai| `8e456b6` | Risk and Issue logs: the headers name the second line (Risk / Cause or trigger, Issue / Details, Action / Owner and review date) |
| 307 | 1.0.307| 2026-11-24 02:45| raidai| `dfb0acc` | Ask AI: each dialog keeps its own answer, applies to the item as it is now, cache per project; always three solutions with the recommendatio |
| 308 | 1.0.308| 2026-11-24 02:53| raidai| `f07f157` | RAID log: matches the Risk and Issue logs; Ask AI 3 solutions for all four kinds (#154) |
| 309 | 1.0.309| 2026-11-24 03:23| tree| `0c7568d` | Champ circuit tree: on the Features page (desktop and phone), a Help card that opens it full screen (close or Esc), and Champ opens it when  |
| 310 | 1.0.310| 2026-11-24 03:32| tree| `679684a` | Help: Project Champ feature inventory (every Help article and its sections plus the newer features, counted area by area, linked to the arti |
| 311 | 1.0.311| 2026-11-24 03:37| tree| `7cc6138` | Champ circuit tree: Features page, Help full screen, and Champ opens it (#155) |
| 312 | 1.0.312| 2026-11-24 04:04| helpbox| `fb2878a` | Help: the circuit tree and the feature inventory share one box (Project Champ at a glance) like the other Help areas; the circuit tree fits  |
| 313 | 1.0.313| 2026-11-24 04:10| helpbox| `f0538fe` | Features: the circuit tree is now a slide in the switching panel (Circuit tree, after Any language), with an Open full screen button, replac |
| 314 | 1.0.314| 2026-11-24 04:15| helpbox| `f1bd83c` | Circuit tree, CodeRabbit fixes: the page grows when the heading and key need room and the board keeps a usable height; on phones the tree (a |
| 315 | 1.0.315| 2026-11-24 04:20| helpbox| `401e553` | Tree view and PERT chart on every project (Gantt toolbar: PERT · Tree view · WBS) |
| 316 | 1.0.316| 2026-11-24 04:40| treepert| `969878e` | Tree view and PERT chart on every project (Gantt toolbar: PERT · Tree view · WBS) |
| 317 | 1.0.317| 2026-11-24 04:49| treepert| `491202e` | Tree view and PERT, CodeRabbit fixes: Record actual costs opens the grid after a diagram; owners picked on the Board show by name; links ign |
| 318 | 1.0.318| 2026-11-24 04:57| treepert| `f21e468` | PERT, CodeRabbit fixes: Record actual costs opens full screen again; the forecast is a forward pass in working days that keeps fractions to  |
| 319 | 1.0.319| 2026-11-24 05:05| treepert| `a535252` | PERT: a milestone's forecast is the working day after the task before it, as on the Gantt (CodeRabbit) |
| 320 | 1.0.320| 2026-11-24 05:12| treepert| `f1ffd8e` | Tree view and PERT chart on every project (PERT · Tree view · WBS) (#157) |
| 321 | 1.0.321| 2026-11-24 11:40| pvfull| `cf9b558` | Tree view and PERT open over the whole window (like the Champ circuit tree) with Close and Esc, and the drawing fills all the space: the tre |
| 322 | 1.0.322| 2026-11-24 11:47| pvfull| `a07bffb` | Full-window views, CodeRabbit fixes: focus goes back to the PERT or Tree view button on close and stays on Close after a resize redraw; PERT |
| 323 | 1.0.323| 2026-11-24 11:52| pvfull| `dde0614` | Tree view and PERT open full screen and fill it (#158) |
| 324 | 1.0.324| 2026-11-24 12:28| tvlevels| `1575be4` | Tree view: level 1 tasks and 1.1 sub-tasks only, with bigger words; the 1.1.1 steps are in each task's side panel (tap a task) (#159) |
| 325 | 1.0.325| 2026-11-25 09:09| esg| `6eeea35` | 🌿 ESG & Sustainability reporting module and the 🌱 CSO view |
| 326 | 1.0.326| 2026-11-25 09:24| esg| `5d2cc74` | 💱 Carbon pricing, CBAM and the carbon credit framework; compact lists; review fixes |
| 327 | 1.0.327| 2026-11-25 09:47| esg| `1c44be5` | 🧾 Electricity bills read by AI, 📥 CSV/Excel import, own ESG menu section; review fixes |
| 328 | 1.0.328| 2026-11-25 10:01| esg| `a4f976d` | ESG review fixes: bills pending at once, numbers parsed before unit factors, keyboard file pickers, escaped import notes, bill costs per cur |
| 329 | 1.0.329| 2026-11-25 10:08| esg| `ae61dd4` | 🌿 ESG & Sustainability reporting module and the 🌱 CSO view (#160) |
| 330 | 1.0.330| 2026-11-25 17:59| efs| `5d157ae` | 📚 ESG emission factor library: search by country, kind, source; one press fills the factor |
| 331 | 1.0.331| 2026-11-25 18:05| efs| `0155367` | 🇺🇳 The 17 UN SDGs covered by default in the Sustainability Statement and the ESG Report |
| 332 | 1.0.332| 2026-11-25 18:23| efs| `6d073d1` | 📚 ESG emission factor library: search by country, kind and source (#161) |
| 333 | 1.0.333| 2026-11-25 19:25| esg-cache| `6cd9b13` | ESG: bump admin-esg.js?v= so browsers load the emission factor library, SDGs, bills and import (the old cached copy hid them) (#162) |
| 334 | 1.0.334| 2026-11-25 19:37| sdg-map| `5ee2b7f` | 🧭 SDG map in the ESG report and statement: all 17 goals as tiles with our own pictograms, shaded by relevance |
| 335 | 1.0.335| 2026-11-25 19:45| sdg-map| `375a874` | 🧭 SDG map: all 17 goals as tiles in the ESG report and statement (#163) |
| 336 | 1.0.336| 2026-11-25 19:51| sdg-fix| `8fb5d14` | SDG map: only delivered, measured avoided-emissions projects count as a goal's measure |
| 337 | 1.0.337| 2026-11-25 19:57| sdg-fix| `45b0e75` | ESG: ids stay unique in every list (avoided emissions, credits, CBAM, carbon prices) |
| 338 | 1.0.338| 2026-11-25 20:03| sdg-fix| `1a24c51` | SDG map: count only delivered avoided-emissions projects as a measure (#164) |
| 339 | 1.0.339| 2026-11-26 01:45| esg-vault| `237b40b` | 🗄 Sustainability vault, 🎯 29 material topics, 📊 chart-rich reports with UN SDG icons, 93 factor sets |
| 340 | 1.0.340| 2026-11-26 02:02| esg-vault| `42d12dd` | ESG vault review fixes: staff logins only (scoped logins refused), vaults created once, edits keyed to their vault and never overwrite newer |
| 341 | 1.0.341| 2026-11-26 02:12| esg-vault| `e49974f` | 🗄 Sustainability vault, 29 material topics, chart-rich reports with SDG icons, 93 factor sets (#165) |
| 342 | 1.0.342| 2026-11-26 08:48| esg-sectors| `0376fd7` | ESG: 131 industries in 14 sector groups, and a labelled double materiality matrix with a numbered key and a note on why it matters |
| 343 | 1.0.343| 2026-11-26 08:57| esg-sectors| `05a326b` | ESG matrix: every dot stays inside its rating cell, however many share it |
| 344 | 1.0.344| 2026-11-26 09:05| esg-sectors| `ecdcbb1` | ESG documents: a part that fails or comes back empty is asked again (up to twice), a part that still fails keeps its text from the last vers |
| 345 | 1.0.345| 2026-11-26 09:20| esg-sectors| `6caea98` | ESG documents: a part counts only when its narrative sections are there; reused text must be in the same language and keeps its older data v |
| 346 | 1.0.346| 2026-11-26 09:29| esg-sectors| `b5ec319` | ESG documents: any narrative section left out is asked for again and merged; {text} answers are read as text; a section still missing is nam |
| 347 | 1.0.347| 2026-11-26 09:37| esg-sectors| `4d09505` | ESG documents: the cut-short note stays while cut text remains, and every section still missing after a restore is named |
| 348 | 1.0.348| 2026-11-26 09:50| esg-sectors| `71f3d23` | ESG documents: tables left out are named too; the quick check answers every key a part asks for |
| 349 | 1.0.349| 2026-11-26 09:56| esg-sectors| `191f920` | ESG: wider industry sectors, labelled materiality matrix, every report part written (#166) |
| 350 | 1.0.350| 2026-11-26 10:13| esg-projects| `02327fd` | ESG: 59 reporting standards in 10 groups with a search (SBTi and less common ones), and ESG & Sustainability for projects and programs: GHG  |
| 351 | 1.0.351| 2026-11-26 10:36| esg-projects| `e059c8d` | ESG review fixes: standards can be ticked again (search uses its own attribute), PCAF needs a financed-emissions inventory, logins without m |
| 352 | 1.0.352| 2026-11-26 10:48| esg-projects| `ee0443c` | ESG review: blank activity values are missing (not zero), no carbon budget or baseline signal from estimates for logins without money, a wai |
| 353 | 1.0.353| 2026-11-26 10:56| esg-projects| `31a5fbf` | ESG review: community investment is hidden from and kept for logins without money, whitespace counts as blank, and the carbon budget tile sa |
| 354 | 1.0.354| 2026-11-26 11:03| esg-projects| `ca3b0ef` | ESG: more reporting standards, and ESG & Sustainability for projects and programs (P5) (#167) |
| 355 | 1.0.355| 2026-11-26 18:08| login-eye| `a1a3b55` | Sign-in: a failed attempt no longer turns the password eye into 'Sign in' (the form picked the first button, which became the eye when it wa |
| 356 | 1.0.356| 2026-11-26 18:15| login-eye-wait| `dcbafe7` | Quick check: wait for the failed sign-in to finish before checking the eye (#169) |
| 357 | 1.0.357| 2026-11-26 18:57| esg-progress| `e67630c` | ESG documents lead with what was done: an Achievements register by pillar with sector measures (airlines included), progress against the pre |
| 358 | 1.0.358| 2026-11-26 19:11| esg-progress| `e19d11f` | ESG progress review: progress follows every save, a failed lookup is never called a first year, compact statements keep the year in review a |
| 359 | 1.0.359| 2026-11-26 19:26| esg-progress| `84c6e36` | ESG: achievements and progress against last year in every pillar (#170) |
| 360 | 1.0.360| 2026-11-26 20:32| sample-data| `5fdc466` | Sample data: the super user loads two programs (Green Freight Hub about 80% done with two projects; Coral Sky Sustainable Operations about 5 |
| 361 | 1.0.361| 2026-11-26 20:49| sample-data| `e292920` | Sample data review: a retry finishes a company or project left half-made, a failed lookup stops the load, Programs refreshes only if still o |
| 362 | 1.0.362| 2026-11-26 21:10| sample-data| `b346dc4` | Quick check: the country test leaves the Scope 1 and 2 tab on its first sub-tab |
| 363 | 1.0.363| 2026-11-26 21:15| esg-orgform| `a8e8a2c` | ESG organisation: country list, currency and standards by country, topics by industry, dd/mm/yyyy dates (#172) |
| 364 | 1.0.364| 2026-11-26 21:33| sample-auto| `49f8ad7` | Sample data loads itself into the database once (after the deploy, or within 15 minutes, or at the super user's next sign-in), with no one s |
| 365 | 1.0.365| 2026-11-26 22:56| p5-ai| `b323131` | P5 impact analysis: ✨ Fill the blanks with AI writes the reason and the action for each element from the project's own data (and suggests a  |
| 366 | 1.0.366| 2026-11-26 23:00| p5-ai| `f33634d` | Project management plan: a new chapter, ESG and carbon (emissions by scope, carbon budget and baseline, carbon actions, the P5 impact analys |
| 367 | 1.0.367| 2026-11-26 23:14| p5-ai| `c6a0a1b` | P5: AI fills the reasons and actions; project plan gets an ESG and carbon chapter (#174) |
| 368 | 1.0.368| 2026-11-27 01:22| esg-grounded| `36182c5` | ESG documents stay on the data: the AI may not claim compliance, restatements, boundaries, funding, pay links, contacts or named plans the d |
| 369 | 1.0.369| 2026-11-27 01:35| vault-ocr| `3693669` | Sustainability vault reads bills: PDF text or OCR for scans and photos (Tesseract in the browser), the AI picks out electricity, gas, water, |
| 370 | 1.0.370| 2026-11-27 01:51| vault-ocr| `290cdc3` | Vault bills review: staff logins only, impossible dates refused, peak and off-peak lines added together, counts from the save that lands, th |
| 371 | 1.0.371| 2026-11-27 02:02| vault-ocr| `1568978` | Sustainability vault: bills read with OCR into Data by month (#176) |
| 372 | 1.0.372| 2026-11-27 03:25| report-styles| `4de1c77` | ESG documents: five report styles (Horizon, Canopy, Atlas, Aurora, Signal) with your photos |
| 373 | 1.0.373| 2026-11-27 03:35| report-styles| `9c73e70` | ESG documents: five report styles with your photos (#177) |
| 374 | 1.0.374| 2026-11-27 03:49| stock-photos| `7316e4b` | Report photos: add one pick at a time (up to 3), remove each, and free stock photos from the report's context |
| 375 | 1.0.375 | 2026-11-27 04:04 | stock-photos | _this commit_ | _see git log_ |
