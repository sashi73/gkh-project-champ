// GKH Project Champ help centre: one article per feature, one section per sub-feature.
// The single source for the console's ❓ Help, and Champ's answers (admin.mjs, chat.mjs).
// Fields: id, a (area), t (title), s (summary), w (where: a console route, or a page), g (Ask Champ guide id), k (search words),
// subs: [{ id, h (heading), st (steps), tip }]. Keep the button names exactly as they appear on screen.
export const AREAS = [
  { id: 'start', n: 'Getting started', i: '🚀' },
  { id: 'portfolio', n: 'Portfolio & programs', i: '🗂' },
  { id: 'projects', n: 'Projects', i: '📅' },
  { id: 'gantt', n: 'Gantt chart', i: '▤' },
  { id: 'cost', n: 'Costing & BOM', i: '💰' },
  { id: 'agile', n: 'Agile: backlog, Kanban & Scrum', i: '📋' },
  { id: 'gov', n: 'Governance & control', i: '🛡' },
  { id: 'docs', n: 'Documents', i: '📁' },
  { id: 'lessons', n: 'Lessons learned', i: '📘' },
  { id: 'ai', n: 'Champ & AI', i: '🎙' },
  { id: 'people', n: 'People & teams', i: '👥' },
  { id: 'cust', n: 'Customers & reports', i: '📨' },
  { id: 'admin', n: 'Admin & access', i: '🔐' },
  { id: 'site', n: 'The website', i: '🌐' }
];

export const ARTICLES = [
  // ---------------- Getting started ----------------
  { id: 'sign-in', a: 'start', t: 'Sign in to the console', w: 'login.html', k: 'login log in password eye show password forgot microphone mic check',
    s: 'Sign in with the email and password your project manager gave you. The eye shows what you typed; the console checks your microphone so Champ can hear you.',
    subs: [
      { id: 'login', h: 'Sign in', st: ['Go to gkhpmo.com and press Login (top right).', 'Type your email (it is your username) and your password.', 'Press Sign in. You land on your start page; a sub-contractor lands straight on their project.'] },
      { id: 'eye', h: 'See your password while typing', st: ['Press the 👁 eye at the right of the password box to show what you typed.', 'Press it again to hide it.'], tip: 'Handy on a phone, where one wrong letter is easy to miss.' },
      { id: 'first-password', h: 'Choose your own password the first time', st: ['If your manager set a starter password, the console asks you to choose your own straight away.', 'Use 10 characters or more, with letters and a number, then type it again and press Save my password.'] },
      { id: 'forgot', h: 'Forgot your password', st: ['Ask your project manager: in 🔐 Users & access they can set a new password for you.', 'You will be asked to choose your own the next time you sign in.'] },
      { id: 'mic', h: 'Microphone check', st: ['The first time you use 🎙 Ask Champ, the browser asks to use the microphone: press Allow.', 'If the microphone stays silent, the console tells you. Check the mute switch on your headset or laptop, and your computer\'s sound settings, then press ↻ Check now.'] }
    ] },
  { id: 'tour', a: 'start', t: 'Find your way around the console', w: '#portfolio', k: 'menu navigation side menu hide menu fold shortcut start page layout',
    s: 'The menu on the left has six groups: Portfolio, Projects, People, Customers, Reports and Admin. Inside a project, tabs run along the top.',
    subs: [
      { id: 'menu', h: 'The menu', st: ['Portfolio: 🗂 Programs, 🔗 Dependency board, 📊 Summary, ▦ Pipeline board.', 'Projects: 📅 All projects, ＋ New project.', 'People: 👥 People, 📅 Team calendar, 📊 Workload, 🙋 My profile.', 'Customers: 📨 Enquiries, 👋 Visitors & leads. Reports: ✨ Ask AI, 📈 Reports & data.', 'Admin: 🔐 Users & access, 📚 Knowledge base, 🕘 Activity log, 🏷 Builds (some only for the project manager).'] },
      { id: 'fold', h: 'Hide the menu for more room', st: ['Press ‹ at the top of the menu (or swipe left on a phone).', 'Press [ on the keyboard to switch it back and forth.'] },
      { id: 'tabs', h: 'Inside a project', st: ['Open a project from 📅 All projects.', 'The tabs: Overview, Gantt, Costing, Critical path, Backlog & Board, BOM, Stakeholders, Scope, Risks, Issues, Contracts, Documents, Comms, Reports, SWMS, Change control, Lessons learned and Ask AI.', 'Above the tabs: the documents bar (💰 Work out the costing, 📜 Generate the charter, 📘 Generate the project plan) and the project tools.'] },
      { id: 'help', h: 'Get help on any screen', st: ['Press ❓ Help in the menu for the whole help centre.', 'Press ? at the top of a screen to read the article for the screen you are on.', 'Or ask 🎙 Ask Champ, bottom right.'] }
    ] },
  { id: 'look', a: 'start', t: 'Change the look: theme, density and width', w: '#portfolio', k: 'theme dark light colour color black gold white navy emerald slate copper compact comfortable wide boxed icons',
    s: 'Pick a colour theme, how tightly things are packed, how wide the page is and whether the menu shows words or icons only.',
    subs: [
      { id: 'theme', h: 'Colour theme', st: ['Press 🎨 at the top of the console.', 'Pick Black & Gold, White, GKH Navy, Emerald or Slate & Copper. It is remembered on this device.'] },
      { id: 'density', h: 'Density and width', st: ['In the same 🎨 panel choose Comfortable or Compact, and Wide or Boxed.'], tip: 'Compact and Wide show the most rows of a big Gantt chart.' },
      { id: 'menu-icons', h: 'Menu with icons only', st: ['In 🎨 choose Menu: Icons only to keep the menu narrow.'] }
    ] },
  { id: 'language', a: 'start', t: 'Use the console in your language', w: '#portfolio', g: 'language', k: 'language translate malay chinese arabic tamil hindi indonesian spanish french bahasa',
    s: 'The whole console, Champ\'s voice and the documents can switch to another language.',
    subs: [
      { id: 'switch', h: 'Change the language', st: ['Press the language button at the top of the console.', 'Pick a language: the menus, buttons and Champ change to it.'] },
      { id: 'docs-lang', h: 'Documents in another language', st: ['When you generate a charter or project plan, pick the document\'s language in the dialog. It can differ from the console\'s.'] },
      { id: 'champ-lang', h: 'Champ in your language', st: ['Speak or type to Champ in your language: it answers and reads aloud in the console\'s language.'] }
    ] },
  { id: 'phone', a: 'start', t: 'Use Project Champ on a phone', w: '#portfolio', k: 'mobile phone tablet ipad app home screen bottom bar more',
    s: 'The console works on a phone: a bottom bar with Champ in the middle, the project tools under ⋯ More.',
    subs: [
      { id: 'bar', h: 'The bottom bar', st: ['Use the bottom bar to move between the main screens; Ask Champ is the button in the middle.'] },
      { id: 'more', h: 'Project tools', st: ['Inside a project, the tools (Modules, Costing, baseline, Excel, export, print) are under ⋯ More.'] },
      { id: 'home', h: 'Add it to your home screen', st: ['In Safari press Share, then Add to Home Screen. On Android, in Chrome press ⋮ then Add to Home screen.'] }
    ] },

  // ---------------- Portfolio ----------------
  { id: 'programs', a: 'portfolio', t: 'Programs: group projects together', w: '#programs', g: 'programs', k: 'program programme group projects roadmap sponsor client move project',
    s: 'A program holds related projects with one manager, sponsor and client. Each program has a roadmap with its dependencies.',
    subs: [
      { id: 'new', h: 'Create a program', st: ['Go to Portfolio > 🗂 Programs and press ＋ New program.', 'Fill in the name, manager, sponsor, client, email and phone.', 'Press Create program.'] },
      { id: 'move', h: 'Put a project into a program', st: ['Open the program and press ⇄ Move a project here.', 'Pick the project and press Move here.'], tip: 'New projects pick their program when you create them; the client and contact details then fill in by themselves.' },
      { id: 'roadmap', h: 'Roadmap and dependencies', st: ['Open a program: 🗺 Roadmap and dependencies shows its projects on a timeline with the links between them.'] },
      { id: 'edit', h: 'Edit or delete a program', st: ['Open it and press ✎ Edit program, or 🗑 Delete. You cannot delete the only program.'] }
    ] },
  { id: 'deps-board', a: 'portfolio', t: 'Dependency board: links between projects', w: '#deps', g: 'deps', k: 'dependency dependencies link projects clash finish to start lag swimlane',
    s: 'Programs as swimlanes, projects as bars, arrows for the links. Red means two plans clash.',
    subs: [
      { id: 'link', h: 'Link two projects', st: ['Go to Portfolio > 🔗 Dependency board and press 🔗 Link projects.', 'Pick the project that must come first and the one that waits for it.', 'Choose the type (finish to start, start to start …) and any lag in days, then Link them.'] },
      { id: 'clash', h: 'Find clashes', st: ['A red arrow means the waiting project starts before the first one allows. The list "Every dependency, problems first" puts those at the top.', 'Open either project and move its dates, or ✎ Edit the link.'] },
      { id: 'remove', h: 'Change or remove a link', st: ['Press the link in the list, then ✎ Edit (Save) or Remove link.'] }
    ] },
  { id: 'summary', a: 'portfolio', t: 'Portfolio summary', w: '#portfolio/summary', g: 'summary', k: 'portfolio summary dashboard health on track watch at risk spi cpi worst first by program',
    s: 'Every project on one page: on track, watch or at risk, with budget, SPI, CPI, late tasks and high risks, worst first.',
    subs: [
      { id: 'read', h: 'Read the summary', st: ['Go to Portfolio > 📊 Summary.', 'Health counts the projects by colour; "Every project, worst first" lists them with the numbers behind the colour.', 'By program groups them; Projects by PMBOK phase shows where each stands.'] },
      { id: 'open', h: 'Act on a project', st: ['Press a project in the list to open it, then its Overview tells you what to do next.'] }
    ] },
  { id: 'pipeline', a: 'portfolio', t: 'Pipeline board: PMBOK phases', w: '#portfolio/board', g: 'pipeline', k: 'pipeline kanban phases pmbok initiation planning execution monitoring closing drag phase',
    s: 'Projects as cards in Initiation, Planning, Execution, Monitoring & Evaluation and Closing. Drag a card to set its phase.',
    subs: [
      { id: 'move', h: 'Move a project to another phase', st: ['Go to Portfolio > ▦ Pipeline board.', 'Drag the card to the phase. It now stays there (pinned).'] },
      { id: 'auto', h: 'Let the phase follow the plan', st: ['On a pinned card choose "follow the plan" again: the phase then moves by itself as the plan progresses.'] },
      { id: 'filter', h: 'One program at a time', st: ['Pick a program in the list at the top to see only its projects.'] }
    ] },

  // ---------------- Projects ----------------
  { id: 'new-project', a: 'projects', t: 'Start a new project', w: '#projects/new', g: 'project', k: 'new project create plan template blank ai build the plan scope of work',
    s: 'Pick the program, name it, say what it is about, then build the plan from a template, a blank plan or ✨ AI.',
    subs: [
      { id: 'create', h: 'Create the project', st: ['Press ＋ New project in the menu.', 'Choose the program: its client, sponsor and contact details fill in by themselves.', 'Give it a name and say what it is about (the AI uses this to draft the plan).', 'Press Create project and plan it →.'] },
      { id: 'how', h: 'Choose how to build the plan', st: ['Template: a ready plan for the type of work, to adjust.', 'Blank: start with an empty Gantt chart.', '✨ Build the plan with AI: tasks, sub-tasks, durations, dependencies and costs drafted from your description. Check it, then ✓ Commit to the plan.'], tip: 'The more you write in "What the project must deliver", the better the AI plan.' },
      { id: 'method', h: 'Waterfall or Agile', st: ['The project asks how it will run its work: Waterfall (Gantt), Kanban or Scrum. You can change it later with ⇄ Change method on the Backlog & Board tab.'] },
      { id: 'modules', h: 'Optional modules', st: ['Tick the modules you need (for example 🧱 BOM and 🦺 SWMS). Change them later with ⚙ Modules.'] }
    ] },
  { id: 'all-projects', a: 'projects', t: 'All projects: find and open a project', w: '#projects', k: 'all projects list find search open project delete',
    s: 'Every project you can see, with its status and dates. Click a row to open it.',
    subs: [
      { id: 'open', h: 'Open a project', st: ['Press 📅 All projects in the menu and click the project.'] },
      { id: 'search', h: 'Search', st: ['Type in the search box at the top to find a project by name or reference.'] },
      { id: 'delete', h: 'Delete a project', st: ['Open the project, then the project tools: 🗑 Delete project. It deletes everything in it, so download an Excel copy first.'] }
    ] },
  { id: 'overview', a: 'projects', t: 'Project overview', w: '#plan/<project>/overview', k: 'overview status rag this week timeline top risks open issues late tasks earned value reminders',
    s: 'One page to see where the project stands: its status, this week\'s work, the timeline, top risks, open issues and late tasks.',
    subs: [
      { id: 'status', h: 'Status (RAG)', st: ['The status card shows Champ\'s colour (On track, Watch closely, Act now) and the reasons, worst first.'] },
      { id: 'week', h: 'This week', st: ['The work due in the next 7 days, and who is on it.'] },
      { id: 'evm', h: 'Time & cost (earned value)', st: ['SPI under 1 means behind schedule; CPI under 1 means over budget. Set a baseline first so there is a plan to compare against.'] },
      { id: 'late', h: 'Late tasks, top risks, open issues', st: ['Click any line to jump to it in the Gantt, Risks or Issues tab.'] }
    ] },
  { id: 'modules', a: 'projects', t: 'Switch optional modules on or off', w: '#plan/<project>/overview', k: 'modules optional bom swms hide tabs turn off',
    s: 'Hide the tabs a project does not need, so the team sees only what matters.',
    subs: [
      { id: 'switch', h: 'Change the modules', st: ['Open the project and press ⚙ Modules in the project tools.', 'Tick or untick the modules: the tabs appear or disappear at once. Nothing is deleted.'] }
    ] },
  { id: 'baseline', a: 'projects', t: 'Set a baseline', w: '#plan/<project>/schedule', k: 'baseline freeze compare plan original re-set baseline slip variance',
    s: 'A baseline freezes today\'s dates and costs so you can see later how far the project has moved.',
    subs: [
      { id: 'set', h: 'Set the baseline', st: ['Open the project and press 📌 Set baseline in the project tools.', 'The Gantt shows the baseline as a thin grey bar under each task.'], tip: 'Set it once the plan and budget are approved. Champ\'s health check measures slips against it.' },
      { id: 'reset', h: 'Re-set it', st: ['After an approved change, press 📌 Re-set baseline to make the new plan the one to measure against.'] }
    ] },
  { id: 'exports', a: 'projects', t: 'Export, print and wide view', w: '#plan/<project>/schedule', k: 'export excel print wide view download workbook csv',
    s: 'Download the whole plan as an Excel workbook, print it, or widen the page.',
    subs: [
      { id: 'excel', h: 'Excel', st: ['In the project tools press ⬇ Excel: every tab of the plan in one workbook.'] },
      { id: 'print', h: 'Print', st: ['Press 🖨 Print, then print or save as PDF from the browser.'] },
      { id: 'wide', h: 'Wide view', st: ['Press Wide view to use the whole width of the screen.'] }
    ] },

  // ---------------- Gantt ----------------
  { id: 'gantt-tasks', a: 'gantt', t: 'Gantt: add tasks, sub-tasks and steps (levels 1, 1.1, 1.1.1)', w: '#plan/<project>/schedule', g: 'task', k: 'gantt task add level 1 1.1 1.1.1 sub-task subtask step wbs hierarchy duration days qty unit cost milestone',
    s: 'Three levels: tasks (1), sub-tasks (1.1) and steps (1.1.1). Each has dates, an owner, a cost and a progress tick.',
    subs: [
      { id: 'task', h: 'Add a task (level 1)', st: ['Open ▤ Gantt.', 'Press ＋ Task (level 1) to add one at the end, or the ＋ next to a task to add one right below it.', 'Type the name, the days, and Qty and Unit $ for its cost.'] },
      { id: 'sub', h: 'Add a sub-task (level 1.1)', st: ['Press ＋ sub-task under a task (it is always there).', 'Sub-tasks stay inside the task\'s dates.'] },
      { id: 'step', h: 'Add a step (level 1.1.1)', st: ['Open a sub-task\'s steps (▸) and press ＋ step.', 'Steps are dated with tick boxes, and stay inside the sub-task\'s dates.'] },
      { id: 'milestone', h: 'Milestones', st: ['Set a task to 0 days, or press ◆ Milestone. It shows as a diamond.'] },
      { id: 'reorder', h: 'Move a task up or down', st: ['Drag the handle at the left of the row up or down. Sub-tasks and steps stay inside their task.'] },
      { id: 'delete', h: 'Delete', st: ['Press ✕ on the row. Deleting a task deletes its sub-tasks and steps too; ↶ Undo brings it back.'] }
    ] },
  { id: 'gantt-full', a: 'gantt', t: 'Full-screen Gantt editor (like Smartsheet)', w: '#plan/<project>/schedule', k: 'full screen editor toolbar smartsheet expand view keyboard esc find',
    s: 'Edit the plan in its own full-screen view with a toolbar: levels, indent and outdent, bold, italic, colours, expand and collapse, find.',
    subs: [
      { id: 'open', h: 'Open and close it', st: ['On ▤ Gantt press ⛶ Full screen.', 'Press ⤡ Exit full screen, or Esc, to go back.'] },
      { id: 'select', h: 'Select a row', st: ['Click a row: the toolbar says "Selected: level 1.1 · name" and only offers what fits that row.'] },
      { id: 'add', h: 'Add rows from the toolbar', st: ['＋ Task adds a level-1 task below the selected one; ＋ Sub-task adds a level 1.1; ＋ Step adds a level 1.1.1 to the selected sub-task.'] },
      { id: 'find', h: 'Find a task', st: ['Type in 🔍 Find a task and press Enter to jump to the next match.'] },
      { id: 'expand', h: 'Expand or collapse', st: ['▾ Expand all shows every sub-task and step; ▸ Collapse all shows the level-1 tasks only.'] },
      { id: 'dialogs', h: 'Notes, reminders and links in full screen', st: ['Sticky notes, reminders and 🔗 Work out dependencies open on top of the full-screen view, so you can keep working there.'] }
    ] },
  { id: 'gantt-indent', a: 'gantt', t: 'Indent and outdent rows', w: '#plan/<project>/schedule', k: 'indent outdent level promote demote move in out ctrl ] [',
    s: 'Move a row one level in (task to sub-task) or out (step to sub-task). What you typed about it stays with it.',
    subs: [
      { id: 'how', h: 'Indent or outdent', st: ['Select the row (in full screen, or with the ⇥ ⇤ buttons on the row).', 'Press ⇥ Indent (Ctrl+]) to move it one level in, or ⇤ Outdent (Ctrl+[) to move it out.'] },
      { id: 'keep', h: 'What moves with it', st: ['The owner, description, priority, points and formatting stay with the row.'] },
      { id: 'refused', h: 'When it is refused', st: ['Champ refuses a move past level 1.1.1, into a dependency loop, or where there is no task above to go under. Hover the greyed button to see why.'] }
    ] },
  { id: 'gantt-format', a: 'gantt', t: 'Bold, italics, underline, colour and highlight', w: '#plan/<project>/schedule', k: 'bold italic italics underline colour color highlight format formatting text style clear',
    s: 'Make a row stand out: bold, italic, underline, a text colour or a highlight, saved with the plan.',
    subs: [
      { id: 'bold', h: 'Bold, italic, underline', st: ['Open ⛶ Full screen and click the row.', 'Press B (Ctrl+B), I (Ctrl+I) or U (Ctrl+U). Press it again to remove it.'] },
      { id: 'colour', h: 'Text colour and highlight', st: ['Pick from A Text colour or ▤ Highlight in the toolbar. "Normal colour" and "No highlight" take it away.'] },
      { id: 'clear', h: 'Clear the formatting', st: ['Press ⌫ to clear all the formatting of the selected row.'] }
    ], tip: 'Formatting shows in the normal view and in exports too.' },
  { id: 'gantt-deps', a: 'gantt', t: 'Dependencies between tasks', w: '#plan/<project>/schedule', k: 'dependency dependencies predecessor successor link links finish to start work out dependencies ai',
    s: 'Link tasks so one waits for another. Let ✨ AI work out the links for the whole plan, or set them yourself.',
    subs: [
      { id: 'ai', h: 'Work out dependencies with AI', st: ['On ▤ Gantt press 🔗 Work out dependencies.', 'Tick the links you agree with and press 🔗 Apply the selected links.', '↶ Undo links takes them all back.'] },
      { id: 'manual', h: 'Set a link yourself', st: ['Press 🔗 Links on the task and pick the tasks it waits for.'] },
      { id: 'loops', h: 'Loops', st: ['A link that would make a loop is refused, so the dates can always be worked out.'] }
    ] },
  { id: 'gantt-notes', a: 'gantt', t: 'Sticky notes on tasks', w: '#plan/<project>/schedule', g: 'note', k: 'sticky note notes comment red amber green colour team message',
    s: 'Leave a note on a task, sub-task or step for the team, in red, amber or green.',
    subs: [
      { id: 'add', h: 'Add a note', st: ['Press 🗒 on the row (Gantt or Kanban board).', 'Write the note, pick red, amber or green, add a Due by date if it has one, and press 💾 Save note (or Enter).', 'Type # to tag it (#blocker, #waiting …): see "#Tags in sticky notes".'] },
      { id: 'read', h: 'Read and edit notes', st: ['A number on 🗒 shows how many notes are open. Press it to read them.', 'Edit or delete a note there; drag the note to move it on the screen.'] },
      { id: 'mention', h: 'Mention someone with @', st: ['Type @ in the note: see "@ mentions" below.'] }
    ] },
  { id: 'note-tags', a: 'gantt', t: '#Tags in sticky notes: blocker, issue, decision, waiting, action, risk, idea, fyi', w: '#plan/<project>/schedule', k: 'tag tags hashtag # blocker blockers issue decision waiting action risk idea fyi kaizen andon label',
    s: 'Put a #tag in a sticky note to say what kind of note it is. #blocker goes to the top of Today; #risk and #issue copy into the registers in one click.',
    subs: [
      { id: 'list', h: 'The tags and what they mean', st: ['🚧 #blocker: work cannot move until this is cleared (the andon).', '❗ #issue: something has gone wrong and needs fixing.', '⚖️ #decision: a decision is needed from someone.', '⏳ #waiting: waiting on someone outside the team (supplier, client, approval).', '✅ #action: a specific to-do for someone.', '⚠️ #risk: might go wrong; worth watching.', '💡 #idea: an improvement idea (kaizen).', 'ℹ️ #fyi: for information, no action needed.'] },
      { id: 'add', h: 'Tag a note', st: ['Open 🗒 on a task.', 'Type # in the note: the list of tags opens; pick one with the arrows and Enter, or click it.', 'Or tap a tag under the note box. "What do they mean?" shows the list.', 'A note can have more than one tag, for example #blocker #waiting.'], tip: 'Add @Name and a Due by date too: the note then shows on that person\'s Today, red once it is past due.' },
      { id: 'today', h: 'Tags on Today', st: ['Needs my attention shows each note with its tags; #blocker notes come first, then by due date.', 'The tag buttons above the list show only one kind (for example only #waiting).', 'The 🚧 blockers count is the #blocker notes for you.'] },
      { id: 'registers', h: '#risk and #issue into the registers', st: ['Save a note with #risk or #issue in it: it goes into the risk register or issue log by itself, with the @ person as owner and the note\'s due date. A red note becomes a high one.', 'The note then shows ✓ in risks / issues. Adding #risk or #issue to a note later (✏ Edit) adds it then. It goes in once only.'] }
    ] },
  { id: 'gantt-mentions', a: 'gantt', t: '@ mentions in notes', w: '#plan/<project>/stake', k: 'at mention @ tag person notify stakeholder email phone',
    s: 'Type @ in a sticky note to name a stakeholder. The list shows every stakeholder with a phone number or email.',
    subs: [
      { id: 'use', h: 'Mention someone', st: ['In a sticky note type @ and the first letters of the name.', 'Pick the person from the list (it scrolls if it is long).'] },
      { id: 'empty', h: 'Nobody in the list', st: ['The list comes from 👥 Stakeholders. If it is empty, Champ tells you to add stakeholders first, with a phone or email.'] }
    ] },
  { id: 'gantt-people', a: 'gantt', t: 'Who does the work: owners and crew', w: '#plan/<project>/schedule', k: 'who owner assign person people crew resource lead stakeholder register',
    s: 'Each task, sub-task and step can have people on it. They come from the project\'s Stakeholder register.',
    subs: [
      { id: 'assign', h: 'Put someone on a task', st: ['Press Who on the row and pick from the 👥 Stakeholder register.', 'Press ★ to make one of them the lead.'] },
      { id: 'setup', h: 'Add people first', st: ['If the list is empty, open 👥 Stakeholders and press ＋ Add stakeholder (or ＋ Add the project manager / ＋ Add the customer).'], tip: 'Rates for labour costs come from 👥 People; the register says who is on this project.' }
    ] },
  { id: 'gantt-reminders', a: 'gantt', t: 'Reminders and calendar invites', w: '#plan/<project>/schedule', k: 'reminder remind bell alarm calendar invite ics outlook google calendar',
    s: 'Set a reminder on any task, sub-task or step, and download it as a calendar invite.',
    subs: [
      { id: 'set', h: 'Set a reminder', st: ['Press 🔔 on the row (or in the full-screen toolbar).', 'Pick when: Working day before start, 7am; Start day, 7am; Finish day, 7am; or your own time.', 'Press Set.'] },
      { id: 'ics', h: 'Put it in your calendar', st: ['Press ⬇ .ics and open the file: Outlook, Google Calendar and Apple Calendar add it.'] },
      { id: 'list', h: 'See all reminders', st: ['The Overview tab lists the project\'s reminders.'] }
    ] },
  { id: 'gantt-progress', a: 'gantt', t: 'Progress, status and late work', w: '#plan/<project>/schedule', k: 'progress percent complete done status colours late bar colour',
    s: 'Tick or type how far each task has got. Bar colours show progress, and late work stands out.',
    subs: [
      { id: 'pct', h: 'Update progress', st: ['Type the % on the task, or tick its steps: a task with steps works its % out from them (weighted by days).', '100% shows ✓ Done.'] },
      { id: 'colours', h: 'Bar colours', st: ['The legend above the chart shows what each colour means. A task past its finish and not done is marked LATE.'] }
    ] },
  { id: 'gantt-fit', a: 'gantt', t: 'Fit to the plan: hide empty dates', w: '#plan/<project>/schedule', k: 'fit to the plan collapse empty dates zoom days weeks fit to screen actual size start january',
    s: 'If the project starts later (say in January), hide the empty days before it so the chart opens where the work is.',
    subs: [
      { id: 'fit', h: 'Fit the chart to the plan', st: ['Press ⇥ Fit to the plan above the chart. The empty dates fold away; the chart starts at the plan.', 'Press it again to show every date.'] },
      { id: 'zoom', h: 'Days, weeks, fit to screen', st: ['Choose Days or Weeks, or Fit to screen to see the whole plan, or Actual size.'] },
      { id: 'widths', h: 'Make the task list or chart wider', st: ['Drag the divider between the list and the chart. Double-click it to reset.'] }
    ] },
  { id: 'gantt-finishby', a: 'gantt', t: 'Re-plan to finish by a date', w: '#plan/<project>/schedule', k: 'finish by deadline re-plan compress crash fit to finish-by late date customer',
    s: 'Give a finish-by date: ✨ AI suggests new dates to make it, or you keep the plan and give the customer a later date.',
    subs: [
      { id: 'set', h: 'Set the finish-by date', st: ['Set Finish by in the plan set-up.', 'If the plan ends later, press ✨ Fit to finish-by.'] },
      { id: 'review', h: 'Review the changes', st: ['Tick the changes you accept and press ✓ Apply the ticked changes, or ↶ Undo the AI changes.', 'Or Keep it as it is, or ↔ Move Finish by to the plan\'s date.'] }
    ] },
  { id: 'gantt-settings', a: 'gantt', t: 'Work days, freeze columns and the WBS', w: '#plan/<project>/schedule', k: 'weekend saturday sunday work days freeze columns column width wbs work breakdown structure tree',
    s: 'Count weekends as work days, freeze columns like Excel, and see the plan as a Work Breakdown Structure.',
    subs: [
      { id: 'weekends', h: 'Weekends and public holidays', st: ['Set 📍 the location: the schedule follows its weekend (Friday–Saturday in Kedah or Jeddah, Thursday–Friday in Tehran) and its public holidays. See "Location".', 'Tick 📅 Weekends allowed to work every day (public holidays still off).'] },
      { id: 'freeze', h: 'Freeze columns', st: ['Press ❄ and pick how many columns stay put while you scroll. ↺ All columns to normal width resets them.'] },
      { id: 'wbs', h: 'Work Breakdown Structure', st: ['Press 🌳 WBS to see the plan as a tree. Press 🌳 WBS ✕ to go back.'] }
    ] },
  { id: 'location', a: 'gantt', t: 'Location: the weekend and public holidays of the place', w: '#plan/<project>/schedule', k: 'location place country state town weekend friday saturday thursday public holidays holiday calendar kedah jeddah tehran malaysia saudi iran work week',
    s: 'Set where the project is worked: the schedule then skips that place\'s weekend (for example Friday–Saturday in Kedah or Jeddah, Thursday–Friday in Tehran) and its public holidays.',
    subs: [
      { id: 'set', h: 'Set the location', st: ['On ▤ Gantt press 📍 Set the location.', 'Type a few letters of the town, state or country (for example Kua, Alor Setar, Jeddah) and pick it from the list.', 'The weekend and the public holidays for the plan\'s years come in; the dates move to fit.'] },
      { id: 'weekend', h: 'Change the weekend', st: ['Press Weekend: … and tick the days this team does not work (up to three).', 'Weekends allowed still works: the team then works every day except the public holidays.'] },
      { id: 'holidays', h: 'Public holidays', st: ['Press 📅 Public holidays: ticked days are off and the schedule skips them.', 'Untick a holiday the team will work. Add your own, such as a site shutdown, with the date and ＋ Add.', 'If the plan runs into a later year, the button shows ⚠: open it and press ↻ Add the later years.'], tip: 'Islamic holidays can move a day with the moon sighting: check them nearer the time.' },
      { id: 'remove', h: 'Back to Monday–Friday', st: ['Press 📍, then Remove the location.'] }
    ] },
  { id: 'gantt-export', a: 'gantt', t: 'Export the Gantt chart', w: '#plan/<project>/schedule', k: 'export gantt picture png jpeg pdf image save print share',
    s: 'Save the Gantt chart as a PNG, JPEG or PDF to put in a report or send.',
    subs: [
      { id: 'export', h: 'Export', st: ['Press ⬇ Gantt export in the project tools.', 'Choose ⬇ PNG, ⬇ JPEG or ⬇ PDF.'] }
    ] },
  { id: 'critical', a: 'gantt', t: 'Critical path and slack', w: '#plan/<project>/critical', g: 'critical', k: 'critical path float slack longest chain finish date delay',
    s: 'The chain of tasks that sets the finish date. A delay to any of them delays the project.',
    subs: [
      { id: 'read', h: 'See the critical path', st: ['Open ⚡ Critical path: critical tasks in red, in order.', '"Slack (float) of every task" shows how many days each other task can slip.'], tip: 'Put your best people and closest watch on the critical tasks.' }
    ] },

  // ---------------- Costing & BOM ----------------
  { id: 'costing', a: 'cost', t: 'Costing: labour and materials', w: '#plan/<project>/budget', g: 'budget', k: 'costing cost budget labour materials qty unit rate hours days price csv',
    s: 'The project\'s cost from the tasks (labour) and the signed-off BOM (materials), by phase, category and month.',
    subs: [
      { id: 'enter', h: 'Enter costs', st: ['On each task type Qty and Unit $ (for labour: people × hours or days each).', 'Open 💰 Costing to see the total, Cost by phase, Cost by category and Cash flow by month.'] },
      { id: 'workout', h: 'Work out the costing', st: ['Press 💰 Work out the costing in the documents bar, or ✨ Work out the costs.'] },
      { id: 'csv', h: 'Download', st: ['Press ⬇ Costing (CSV).'] }
    ] },
  { id: 'indicative', a: 'cost', t: 'Indicative costs with AI', w: '#plan/<project>/budget', k: 'indicative costs estimate benchmark ai australian international rates',
    s: 'Let AI fill in indicative costs from Australian and international benchmarks: a reference to review, not a quote.',
    subs: [
      { id: 'fill', h: 'Fill them in', st: ['On 💰 Costing press ✨ Indicative costs.', 'Check them and press Add them as indicative costs.', 'Lines filled in by AI are marked; change one to mark it reviewed. ↶ Undo the indicative costs removes them.'] }
    ] },
  { id: 'approve-budget', a: 'cost', t: 'Approve the budget', w: '#plan/<project>/budget', g: 'budget', k: 'approve budget sign signature approved budget sponsor',
    s: 'Approve the costing as the project\'s budget, with your name, role and signature.',
    subs: [
      { id: 'approve', h: 'Approve it', st: ['On 💰 Costing press ✍ Approve the budget.', 'Type your name and role, sign, and press ✍ Approve and sign.'], tip: 'Champ\'s health check compares the forecast cost with this approved budget.' }
    ] },
  { id: 'evm', a: 'cost', t: 'Earned value: SPI, CPI and forecasts', w: '#plan/<project>/overview', k: 'earned value evm spi cpi eac bac forecast performance index',
    s: 'Earned value shows if you are on time (SPI) and on budget (CPI), and forecasts the final cost.',
    subs: [
      { id: 'read', h: 'Read the numbers', st: ['SPI = work done ÷ work planned by today. Under 1: behind schedule.', 'CPI = value of work done ÷ actual cost. Under 1: over budget.', 'EAC is the forecast final cost.'] },
      { id: 'need', h: 'What it needs', st: ['A baseline (📌 Set baseline), costs on the tasks, and progress kept up to date.'] }
    ] },
  { id: 'quote', a: 'cost', t: 'Quotes and invoices', w: '#plan/<project>/budget', k: 'quote quotation invoice tax invoice variation revised quote milestone payment',
    s: 'Make a quote with the project plan, a revised quote for a variation, and a tax invoice from a quote.',
    subs: [
      { id: 'quote', h: 'Make the quote', st: ['On 💰 Costing press 📄 Make the quote & PM plan. ↻ Update it from the plan when the plan changes.'] },
      { id: 'revised', h: 'A revised quote (variation)', st: ['After an approved change request press 📄 Make a revised quote (variation).'] },
      { id: 'invoice', h: 'Tax invoice', st: ['Press 🧾 Make the tax invoice from the quote.'] }
    ] },
  { id: 'bom', a: 'cost', t: 'Bill of Materials (BOM)', w: '#plan/<project>/bom', g: 'bom', k: 'bom bill of materials materials draft ai sign off reopen template quantities',
    s: 'List the materials, check each line, and sign it off: it then goes into the Costing as Materials.',
    subs: [
      { id: 'draft', h: 'Draft it with AI', st: ['Open 🧱 BOM and press 🧱 Start the BOM, then ✨ Draft the materials.', 'Or ＋ Line to add your own.'] },
      { id: 'check', h: 'Check each line', st: ['Check the quantity, unit price and the task it belongs to, then tick ✓.'] },
      { id: 'signoff', h: 'Sign it off', st: ['When every line is checked press ✍ Sign off. The total goes into 💰 Costing as Materials.'] },
      { id: 'reopen', h: 'Change it after sign-off', st: ['Press 🔓 Reopen, change it, then ✍ Sign off again to put it back in the costing.'] },
      { id: 'template', h: 'Templates', st: ['💾 Save as a template to reuse it; 📋 Templates to start from one.'] }
    ] },
  { id: 'bom-order', a: 'cost', t: 'Things to order and long-lead items', w: '#plan/<project>/bom', k: 'order ordering long lead lead time things to order order by procurement purchase',
    s: '🛒 Things to order lists each material with the date to order it by, from its lead time.',
    subs: [
      { id: 'list', h: 'What to order and when', st: ['On 🧱 BOM open 🛒 Things to order. Set each line\'s lead time (working days to arrive).'] },
      { id: 'mark', h: 'Mark it ordered', st: ['Tick the lines and press ✓ Mark ticked as ordered (or ✓ Mark ordered on one).'] },
      { id: 'tasks', h: 'Ordering tasks in the Gantt', st: ['Press ＋ Ordering tasks for long-lead items: a task to order each one, linked before the task that needs it.'] }
    ] },

  // ---------------- Agile ----------------
  { id: 'agile-method', a: 'agile', t: 'Kanban or Scrum: choose how the team works', w: '#plan/<project>/board', k: 'agile kanban scrum method waterfall hybrid change method',
    s: 'The first time you open 📋 Backlog & Board, pick Kanban or Scrum. Every Gantt task goes into the Product Backlog.',
    subs: [
      { id: 'pick', h: 'Pick the method', st: ['Open 📋 Backlog & Board and choose Kanban (continuous flow, WIP limits) or Scrum (sprints).', 'Scrum: choose 2-week sprints or 4-week sprints.'] },
      { id: 'change', h: 'Change it later', st: ['Press ⇄ Change method.'] }
    ] },
  { id: 'backlog', a: 'agile', t: 'Product Backlog and the Definition of Ready (DOR)', w: '#plan/<project>/board', g: 'backlog', k: 'backlog product backlog dor definition of ready story points urgency owner refine stories',
    s: 'Refine each item until it is ✅ DOR ready: a description, story points, urgency and an owner.',
    subs: [
      { id: 'refine', h: 'Make an item ready', st: ['Click an item (or ✏).', 'Give it a description, story points, urgency and an owner.', 'With all four it shows ✅ DOR ready; with some, DOR partial.'] },
      { id: 'add', h: 'Add an item', st: ['Press ＋ Item: it is added to the Gantt too.'] },
      { id: 'stories', h: 'Stories', st: ['Open an item and press ✨ Suggest stories, or ＋ Story. Theme points add up its stories.'] },
      { id: 'pull', h: 'Pull it into the work', st: ['→ Board (Kanban) or → Sprint 1, → Sprint 2 (Scrum).'] }
    ] },
  { id: 'dod', a: 'agile', t: 'Definition of Done (DoD)', w: '#plan/<project>/board', k: 'dod definition of done done criteria acceptance checklist',
    s: 'The checks an item must pass before it counts as done.',
    subs: [
      { id: 'add', h: 'Add Definition of Done lines', st: ['On 📋 Backlog & Board press ＋ DoD and type a check (for example "Tested by the customer").'] },
      { id: 'use', h: 'Use it', st: ['Before moving an item to Done, check every DoD line. Done items are locked.'] }
    ] },
  { id: 'kanban', a: 'agile', t: 'Kanban board', w: '#plan/<project>/board', g: 'board', k: 'kanban board columns wip limit drag card full view png',
    s: 'Cards move across the columns as the work gets done. WIP limits stop too much work starting at once.',
    subs: [
      { id: 'move', h: 'Move a card', st: ['Drag it to the next column, or use the arrows on the card (Back one column, Next column).'] },
      { id: 'full', h: 'See the whole board', st: ['Press 🖼 Full view to see the board as one picture; save it as a PNG.'] },
      { id: 'notes', h: 'Notes on cards', st: ['Press 🗒 on a card to leave a sticky note, the same as on the Gantt.'] }
    ] },
  { id: 'sprints', a: 'agile', t: 'Sprint planning and running a sprint', w: '#plan/<project>/board', g: 'sprint', k: 'sprint planning scrum start sprint complete sprint goal velocity capacity ai',
    s: 'Plan a sprint, start it, run it on the sprint board and complete it.',
    subs: [
      { id: 'plan', h: 'Plan the sprint', st: ['Open 🗓 Sprint planning: Sprint 1 and Sprint 2 next to the backlog.', 'Write the sprint goal and objective and move items in with → S1.'] },
      { id: 'ai', h: 'Plan the sprints with AI', st: ['Press ✨ Plan the sprints with AI: it weighs urgency, DOR, the Gantt dates, dependencies and capacity.', 'Press Apply to sprint planning if you agree.'] },
      { id: 'start', h: 'Start and complete', st: ['Press ▶ Start sprint. Work on the 🏃 Sprint board.', 'At the end press ■ Complete sprint: say if the goal was met. Unfinished items go back to the backlog (↩ Backlog).'] }
    ] },
  { id: 'agile-charts', a: 'agile', t: 'Charts and retro: burn-down, velocity, team', w: '#plan/<project>/board', k: 'burn down burndown burn up velocity retro retrospective team contribution charts',
    s: 'See how the sprint and the project are going, and who contributed.',
    subs: [
      { id: 'charts', h: 'Open the charts', st: ['Press 📈 Charts & retro: 🔥 Burn-down, ⚡ Velocity, 📈 Burn-up (project) and 👥 Team contribution (points done).'] },
      { id: 'retro', h: 'Retro', st: ['Use the charts at the retro; lessons go to 📘 Lessons learned.'] }
    ] },

  // ---------------- Governance ----------------
  { id: 'stakeholders', a: 'gov', t: 'Stakeholder register', w: '#plan/<project>/stake', k: 'stakeholder register people contacts email phone role customer project manager',
    s: 'Everyone with a part in the project. People on tasks and @ mentions come from this list.',
    subs: [
      { id: 'add', h: 'Add stakeholders', st: ['Open 👥 Stakeholders and press ＋ Add stakeholder.', 'Or ＋ Add the project manager and ＋ The customer in one tap.', 'Give a phone or email so they can be @ mentioned and invited.'] },
      { id: 'big', h: 'A bigger view', st: ['Press ⤢ to expand the register.'] }
    ] },
  { id: 'raci', a: 'gov', t: 'RACI map', w: '#plan/<project>/stake', k: 'raci responsible accountable consulted informed matrix map',
    s: 'Who is Responsible, Accountable, Consulted and Informed for each activity.',
    subs: [
      { id: 'open', h: 'Open and fill it', st: ['On 👥 Stakeholders press 🧭 RACI map.', 'Click a cell to set R, A, C or I. Suggested letters show in grey: ✓ Keep them or set your own.'] },
      { id: 'rule', h: 'The rule', st: ['Each activity needs exactly one A and at least one R: the map flags any that do not.'] }
    ] },
  { id: 'scope', a: 'gov', t: 'Scope: in scope and out of scope', w: '#plan/<project>/scope', k: 'scope in scope out of scope deliverables requirements customer request',
    s: 'What the project will and will not deliver, agreed with the customer.',
    subs: [
      { id: 'write', h: 'Write the scope', st: ['Open 🎯 Scope.', 'Press ↓ Copy into In scope to start from the customer\'s request, then edit.', 'List what is out of scope too.'] },
      { id: 'ai', h: 'With AI', st: ['Press ✨ Draft with AI to draft it from the plan.'] }
    ] },
  { id: 'risks', a: 'gov', t: 'Risk register and heat map', w: '#plan/<project>/risks', g: 'risk', k: 'risk risks register heat map likelihood impact response mitigation score',
    s: 'Record risks with likelihood, impact and the response. The heat map shows the worst at a glance.',
    subs: [
      { id: 'add', h: 'Add a risk', st: ['Open ⚠ Risks and press ＋ Add risk.', 'Describe it, rate likelihood and impact (1 to 5) and write the response.'] },
      { id: 'heat', h: 'The heat map', st: ['Top right is the worst. A score of 12 or more counts as a high risk in Champ\'s health check.'] },
      { id: 'close', h: 'Close a risk', st: ['Set its status to Closed when it can no longer happen.'] }
    ] },
  { id: 'issues', a: 'gov', t: 'Issue log', w: '#plan/<project>/issues', k: 'issue issues log problem priority critical high resolution resolve',
    s: 'Problems happening now, with a priority, an owner and a resolution.',
    subs: [
      { id: 'add', h: 'Log an issue', st: ['Open ❗ Issues and press ＋ Add issue. Set its priority (Critical, High …) and owner.'] },
      { id: 'ai', h: 'Possible resolutions from AI', st: ['Press ✨ on the issue for possible resolutions.'] },
      { id: 'resolve', h: 'Resolve it', st: ['Set the status to Resolved. Open critical and high issues turn the project amber or red.'] }
    ] },
  { id: 'change', a: 'gov', t: 'Change control', w: '#plan/<project>/change', g: 'change', k: 'change request cr change control variation approve reject defer impact meeting register',
    s: 'Raise a change request, assess its impact with AI, decide, and keep every decision as a record.',
    subs: [
      { id: 'raise', h: 'Raise a change request', st: ['Open 🔁 Change control and press ＋ New change request.', 'Describe the change and why. Press Raise the change request.'] },
      { id: 'impact', h: 'Assess the impact with AI', st: ['Press ✨ Assess the impact with AI: time, cost, scope and risk, from the plan.', '📊 Impact shows it; ↻ Assess the impact again after the plan changes.'] },
      { id: 'decide', h: 'Decide', st: ['✍ Approve and sign, ✕ Reject or ⏸ Defer. Every decision is kept in the change register.'] },
      { id: 'meeting', h: 'Change control meeting', st: ['Press 📞 Call a change control meeting to review the open requests together; the invite goes out from Comms.'] },
      { id: 'register', h: 'Change register', st: ['Press 📄 Change register for a document of every change.'] }
    ] },
  { id: 'contracts', a: 'gov', t: 'Contracts', w: '#plan/<project>/contracts', k: 'contract contracts customer contract subcontract price payment stages dates variations defects',
    s: 'Keep the customer and supplier contracts with the project, and ask AI what to watch.',
    subs: [
      { id: 'add', h: 'Add a contract', st: ['Open 📜 Contracts and upload the contract.'] },
      { id: 'ai', h: 'Ask AI about it', st: ['Press 🧠 on the contract: AI summarises price, payment stages, key dates, variations, the defects period and anything to watch.'] }
    ] },
  { id: 'comms', a: 'gov', t: 'Comms: meetings, invites and the meeting log', w: '#plan/<project>/comms', k: 'comms communication meeting invite ics email meeting log minutes guest',
    s: 'Set up meetings with the stakeholders, send invites, and keep a log of what was decided.',
    subs: [
      { id: 'meet', h: 'Set up a meeting', st: ['Open 📞 Comms and press 📞 Set up the meeting.', 'Pick who gets it, ＋ Add guest for anyone else, write the message.', 'Press ✉ Send, or ⬇ Invite (.ics).'] },
      { id: 'log', h: 'Meeting log', st: ['Record what was decided in 🗒 Meeting log. 📊 What this meeting means for the project sums it up.'] },
      { id: 'move', h: 'Move a meeting', st: ['Press ↔ Reschedule and ⬇ New invite (.ics).'] }
    ] },
  { id: 'reports', a: 'gov', t: 'Project reports', w: '#plan/<project>/reports', k: 'report status report weekly report rag narrative email pdf word report log',
    s: 'Status reports from the plan, with an AI narrative, sent by email and kept in the report log.',
    subs: [
      { id: 'new', h: 'Make a report', st: ['Open 📊 Reports and press ＋ New report.', 'Press ✨ Write the narrative with AI, then edit.', 'Download ⬇ PDF or ⬇ Word.'] },
      { id: 'email', h: 'Email it', st: ['Press ✉ Email the report: pick who gets it, check the message, send.'] },
      { id: 'log', h: 'Report log', st: ['🗂 Report log keeps every report sent.'] }
    ] },
  { id: 'swms', a: 'gov', t: 'SWMS: Safe Work Method Statement', w: '#plan/<project>/swms', k: 'swms safe work method statement safety whs hazard control construction',
    s: 'A Safe Work Method Statement for high-risk construction work, drafted from the plan.',
    subs: [
      { id: 'write', h: 'Write it', st: ['Open 🦺 SWMS (switch it on in ⚙ Modules if you do not see it).', 'Press ✨ Write the SWMS from this plan, then check each step, hazard and control.', '＋ Add a step or ＋ Add a row for more.'] },
      { id: 'download', h: 'Download', st: ['⬇ PDF, ⬇ Word or 🖨 Print, for signing on site.'] }
    ] },

  // ---------------- Documents ----------------
  { id: 'charter', a: 'docs', t: 'Generate the project charter', w: '#plan/<project>/overview', g: 'charter', k: 'charter project charter scope document pdf word generate theme',
    s: 'A charter of up to 4 pages, drafted from the plan, in your colours and language.',
    subs: [
      { id: 'make', h: 'Make it', st: ['Press 📜 Generate the charter in the documents bar.', 'Pick a colour theme and the language.', '👁 Preview, then ⬇ PDF, or ⬇ Word (to edit).'] },
      { id: 'improve', h: 'Improve it with AI', st: ['✨ Improve the whole charter with AI: structure, grammar and the missing pieces. Or ✨ on one section.'] }
    ] },
  { id: 'plandoc', a: 'docs', t: 'Generate the project management plan', w: '#plan/<project>/overview', g: 'plandoc', k: 'project plan document project management plan pmp generate pdf word',
    s: 'The full project management plan as a document, from the live plan.',
    subs: [
      { id: 'make', h: 'Make it', st: ['Press 📘 Generate the project plan in the documents bar.', 'Pick the look (🎨 The look) and language, preview, then download PDF or Word.'] },
      { id: 'again', h: 'Update it', st: ['✨ Write again from the plan after the plan changes.'] }
    ] },
  { id: 'documents', a: 'docs', t: 'Project documents and AI review', w: '#plan/<project>/docs', k: 'documents upload files review ai against the plan version decision records',
    s: 'Keep the project\'s documents in one place, and let AI check them against the plan.',
    subs: [
      { id: 'upload', h: 'Add a document', st: ['Open 📁 Documents and upload it. ⬆ adds a new version.'] },
      { id: 'review', h: 'Review against the plan', st: ['Press 🧠 on a document, or 🧠 Review all against the plan: what matches, what conflicts and what is missing.'] },
      { id: 'records', h: 'Decision records', st: ['📁 Decision records keeps every approval and change decision.'] },
      { id: 'tidy', h: 'Tidy up', st: ['🧹 Keep newest 3 removes older versions.'] }
    ] },

  // ---------------- Lessons ----------------
  { id: 'lessons', a: 'lessons', t: 'Lessons learned register', w: '#plan/<project>/lessons', k: 'lessons learned lesson register retrospective what went well',
    s: 'Record lessons as you go, and turn them into tasks or risks.',
    subs: [
      { id: 'add', h: 'Add a lesson', st: ['Open 📘 Lessons learned and press ＋ Add a lesson.'] },
      { id: 'act', h: 'Act on it', st: ['Press ✓ As a task to put it in the Gantt, or ⚠ As a risk for the register.'] },
      { id: 'ai', h: 'Suggest lessons', st: ['Press ✨ Suggest lessons: AI reads the project and suggests some. Tick them and ＋ Add the ticked lessons.'] }
    ] },
  { id: 'lessons-library', a: 'lessons', t: 'Lessons library', w: '#plan/<project>/lessons', k: 'lessons library other projects reuse previous projects',
    s: 'Lessons from every project, to use on this one.',
    subs: [
      { id: 'use', h: 'Use a lesson from another project', st: ['Press 📚 Lessons library, find one and press ＋ Use as a lesson here.'] }
    ] },
  { id: 'lessons-video', a: 'lessons', t: 'The 90-second lessons video and report', w: '#plan/<project>/lessons', k: 'lessons video 90 second report word pdf champ voice',
    s: 'Champ turns the lessons into a 90-second video with its voice, and a report.',
    subs: [
      { id: 'play', h: 'Play the video', st: ['Press 🎬 Play the 90-second video.'] },
      { id: 'save', h: 'Save it', st: ['💾 Save the report and video to Documents; ⬇ Word or 🖨 Print or save as PDF.'] }
    ] },

  // ---------------- Champ & AI ----------------
  { id: 'ask-champ', a: 'ai', t: 'Ask Champ: talk or type', w: '#portfolio', k: 'ask champ assistant voice microphone talk type speak question help chatbot',
    s: 'Champ is the gold globe at the bottom right. Talk or type a question, and it answers, shows you where to click and reads it aloud.',
    subs: [
      { id: 'ask', h: 'Ask a question', st: ['Press 🎙 Ask Champ (bottom right; the middle of the bottom bar on a phone).', 'Press the mic and speak, or type and press Enter.'] },
      { id: 'voice', h: 'Sound on or off', st: ['Press 🔊 to mute, 🔇 to let Champ speak. 🔊 Read it to me reads an answer aloud.'] },
      { id: 'menu', h: 'The ☰ menu', st: ['☰ lists the step-by-step guides and Champ\'s review.'] },
      { id: 'knows', h: 'What Champ knows', st: ['The console, this help centre, your projects (what your login can see) and the course notes in the 📚 Knowledge base.'] }
    ] },
  { id: 'show-me', a: 'ai', t: 'Show me: step-by-step guides', w: '#portfolio', k: 'show me guide tour walkthrough pointer spotlight step by step',
    s: 'Champ moves a pointer across the screen, lights up each button and tells you what to do.',
    subs: [
      { id: 'start', h: 'Start a guide', st: ['Ask Champ "how do I …" or pick a guide from ☰.', 'Press Next ▶ for each step, or ▶ Show me to let Champ go on by itself (⏸ Pause stops it).'] },
      { id: 'from-help', h: 'From the help centre', st: ['Articles with a ▶ Show me button start the matching guide in the console.'] }
    ] },
  { id: 'champ-review', a: 'ai', t: 'Champ\'s review and alerts (red, amber, green)', w: '#portfolio/summary', k: 'review alert alerts red amber green rag health watch act now watch closely on track globe spin morning',
    s: 'Every morning Champ checks every project with fixed rules and colours it: green On track, amber Watch closely, red Act now.',
    subs: [
      { id: 'rules', h: 'How the colour is set', st: ['From earned value (SPI, CPI), the slip against the baseline, late tasks and milestones, high risks, critical issues and the forecast cost against the approved budget.', 'The same rules every time, so it can be explained to a client.'] },
      { id: 'globe', h: 'The globe spins faster as it gets worse', st: ['Green: slow. Amber: medium. Red: fast. (It stays still if your device asks for reduced motion.)'] },
      { id: 'brief', h: 'Champ\'s brief', st: ['Press ✨ Champ\'s review: what is wrong, why, and what Champ would do next, for red and amber projects.'] },
      { id: 'when', h: 'When it runs', st: ['Every day at 7:00 am Sydney time, and again whenever the project\'s numbers change.'] }
    ] },
  { id: 'auto-answer', a: 'ai', t: 'Champ\'s automatic answers', w: '#portfolio', k: 'auto answer automatic answer reply chatbot website visitors faq knowledge base',
    s: 'Champ answers questions by itself, in the console and on the website, from this help centre, the console map and the knowledge base.',
    subs: [
      { id: 'console', h: 'In the console', st: ['Ask Champ answers from the help articles and your projects, and offers ▶ Show me when there is a guide.'] },
      { id: 'site', h: 'On the website', st: ['Visitors chat with Champ on gkhpmo.com: it answers about the product in their language and passes leads to 👋 Visitors & leads.'] },
      { id: 'teach', h: 'Teach Champ more', st: ['Add documents to the 📚 Knowledge base: Champ uses them in its answers. 🔎 Try a question checks what it finds.'] }
    ] },
  { id: 'project-ai', a: 'ai', t: 'Ask AI about a project', w: '#plan/<project>/intel', g: 'intel', k: 'ask ai project intelligence question analyse plan',
    s: 'Ask anything about one project: AI reads its plan, costs, risks and documents to answer.',
    subs: [
      { id: 'ask', h: 'Ask', st: ['Open 🧠 Ask AI in the project, type the question and press Ask.'] },
      { id: 'manage', h: 'Keep or clear answers', st: ['▾ ▸ fold an answer; 🗑 clears it; Keep only the 3 newest answers.'] }
    ] },
  { id: 'ai-data', a: 'ai', t: 'Ask AI about all your data', w: '#sql/ask', k: 'ask ai data query report natural language question all projects',
    s: 'Ask a question in plain words across all projects: AI writes the query and shows the answer.',
    subs: [
      { id: 'ask', h: 'Ask', st: ['Go to Reports > ✨ Ask AI, type the question, press Ask.', 'Open in the SQL editor to see or change the query.'] },
      { id: 'report', h: 'Write a report', st: ['Press ✨ Write report with AI, then 📄 Publish as report.'] }
    ] },
  { id: 'knowledge', a: 'ai', t: 'Knowledge base', w: '#knowledge', k: 'knowledge base kb documents course notes teach champ upload',
    s: 'Documents Champ learns from: course notes, procedures, standards. Project manager only.',
    subs: [
      { id: 'add', h: 'Add a document', st: ['Go to Admin > 📚 Knowledge base, ＋ Add a document, then Add to the knowledge base.'] },
      { id: 'try', h: 'Try a question', st: ['🔎 Try a question shows which passages Champ would use.'] }
    ] },

  // ---------------- People ----------------
  { id: 'people', a: 'people', t: 'People: the team register', w: '#people', g: 'people', k: 'people person team staff contractor add import export csv excel archive rate per hour sample',
    s: 'Everyone who works on your projects, in two groups (Technical & general; Construction), with role, rate per hour and credentials.',
    subs: [
      { id: 'add', h: 'Add a person', st: ['Go to 👥 People and press ＋ Person: group, role, rate per hour, contact details.'] },
      { id: 'import', h: 'Import or export', st: ['⬇ Blank template (CSV), fill it, then ⬆ Import.', '⬇ Export (CSV or Excel).', '🧪 Load 10 sample people to try it out.'] },
      { id: 'archive', h: 'Archive or delete', st: ['🗄 Archive someone who left (↩ Restore brings them back). 🗑 Delete permanently removes them.'] }
    ] },
  { id: 'resume', a: 'people', t: 'Fill someone in from a resume', w: '#people', k: 'resume cv pdf word ai fill in person',
    s: 'Upload a PDF or Word resume and AI fills in the person.',
    subs: [
      { id: 'fill', h: 'From a resume', st: ['On 👥 People press ✨ ＋ From a resume and pick the file. Check what it filled in and Save.'] }
    ] },
  { id: 'credentials', a: 'people', t: 'Credentials and compliance', w: '#people', k: 'credentials compliance tickets licences licenses insurance permits expiry white card',
    s: 'Tickets, licences, insurance and permits, with expiry dates, so you know who can work where.',
    subs: [
      { id: 'add', h: 'Add credentials', st: ['Open the person, ✎ Edit, and fill in 🎫 Tickets & licences, 🛡 Insurance (contractors) and 📋 Permits.'] },
      { id: 'check', h: 'See what needs attention', st: ['🎓 Credentials & compliance lists what is expired or missing.'] }
    ] },
  { id: 'profile', a: 'people', t: 'My profile', w: '#me', g: 'profile', k: 'my profile me rate education qualifications certifications resume edit',
    s: 'Everyone keeps their own profile: rate per hour, education, qualifications, certifications and resume.',
    subs: [
      { id: 'edit', h: 'Fill it in', st: ['Press 🙋 My profile, then ✏ Edit my profile (＋ Fill in my profile the first time). Save my profile.'] },
      { id: 'work', h: 'My work', st: ['📅 My work shows your tasks across projects.'] }
    ] },
  { id: 'calendar', a: 'people', t: 'Team calendar', w: '#people/calendar', g: 'calendar', k: 'team calendar who is on what schedule week',
    s: 'Who is on what, day by day.',
    subs: [
      { id: 'read', h: 'Read it', st: ['Go to 📅 Team calendar. ◀ Week and Week ▶ move it; Today comes back.'] }
    ] },
  { id: 'workload', a: 'people', t: 'Workload', w: '#people/workload', g: 'calendar', k: 'workload capacity overloaded allocation utilisation',
    s: 'How busy each person is, so nobody is overloaded.',
    subs: [
      { id: 'read', h: 'Read it', st: ['Go to 📊 Workload. Red means more work than days; move tasks or add people.'] }
    ] },

  // ---------------- Customers & reports ----------------
  { id: 'enquiries', a: 'cust', t: 'Enquiries', w: '#enquiries', k: 'enquiries enquiry contact form demo request customer lead',
    s: 'Messages from the website\'s contact form, translated into English if needed.',
    subs: [
      { id: 'read', h: 'Read and follow up', st: ['Go to 📨 Enquiries. "Show what they wrote" shows the original language.'] }
    ] },
  { id: 'visitors', a: 'cust', t: 'Visitors and leads', w: '#visitors', k: 'visitors leads potential customers website chat counter',
    s: 'Who chatted with Champ on the website and left their details, and the visitor counter.',
    subs: [
      { id: 'read', h: 'See the leads', st: ['Go to 👋 Visitors & leads. ⬇ CSV downloads them.'] }
    ] },
  { id: 'reports-data', a: 'cust', t: 'Reports and data', w: '#sql', k: 'reports data query builder sql editor saved queries publish csv common reports',
    s: 'Common reports, a step-by-step query builder, the SQL editor, saved queries and published reports.',
    subs: [
      { id: 'common', h: 'Common reports', st: ['Go to 📈 Reports & data and pick from Common reports.'] },
      { id: 'build', h: 'Build a query', st: ['"Build a query, step by step": pick a table, ＋ Add filter, ▶ Run.'] },
      { id: 'save', h: 'Save and publish', st: ['💾 Save query; 📄 Publish as report; ⬇ CSV.'] }
    ] },

  // ---------------- Admin ----------------
  { id: 'users', a: 'admin', t: 'Users and access: create a login', w: '#users', g: 'user', k: 'user users login create account who can see access role permissions password project director contractor personnel custom google',
    s: 'The project manager (super user) creates logins by email, then sets the projects and modules each person can use.',
    subs: [
      { id: 'new', h: 'Create a login', st: ['Go to 🔐 Users & access and press ＋ New user.', 'Type their email (their username) and pick the role: Project director, Contractor or Project personnel.', 'Choose a password (10+ characters, letters and a number), type it again.', 'Next: confirm →, then ✓ Confirm and create.'] },
      { id: 'perms', h: 'Set permissions', st: ['Press ⚙ Permissions: pick the projects and, for each module, none, view or edit. Save permissions. "Who gets what" sums it up.'] },
      { id: 'password', h: 'Reset a password', st: ['Press 🔑 on the user and Set the password. They choose their own at next sign-in.'] },
      { id: 'google', h: 'Google sign-ins', st: ['Google sign-ins are view only; ⬆ Upgrade gives one a role.'] }
    ] },
  { id: 'contractor', a: 'admin', t: 'Contractor logins', w: '#users', k: 'contractor subcontractor sub-contractor login one project',
    s: 'A contractor sees only their own project, with view or edit access.',
    subs: [
      { id: 'make', h: 'Give a contractor access', st: ['＋ New user with the role Contractor, then ⚙ Permissions: tick their project.', 'They sign in straight to that project.'] }
    ] },
  { id: 'activity', a: 'admin', t: 'Activity log and sign-ins', w: '#activity', k: 'activity log audit history sign-ins who changed what ip',
    s: 'Who did what in the console, and every sign-in. Project manager only.',
    subs: [
      { id: 'read', h: 'Read it', st: ['Go to 🕘 Activity log. 🔐 Sign-ins to the console lists when, who, how and the IP address.'] }
    ] },
  { id: 'builds', a: 'admin', t: 'Builds: what changed', w: '#builds', k: 'builds version release notes what changed updates',
    s: 'Every version of Project Champ and what it changed.',
    subs: [
      { id: 'read', h: 'Read it', st: ['Go to 🏷 Builds: the newest first. Champ also knows the latest changes.'] }
    ] },

  // ---------------- Website ----------------
  { id: 'site-chat', a: 'site', t: 'Chat with Champ on the website', w: 'index.html', k: 'website chat champ visitor question demo',
    s: 'Visitors can ask Champ about Project Champ on any page, by voice or text, in their language.',
    subs: [
      { id: 'ask', h: 'Ask Champ', st: ['Press Ask Champ at the bottom right of any page.', 'Type or press the mic. Leave your name and email if you want a demo.'] }
    ] },
  { id: 'site-language', a: 'site', t: 'The website in your language', w: 'index.html', k: 'website language translate 20 languages',
    s: 'The website, the film and this help centre switch to your language.',
    subs: [
      { id: 'switch', h: 'Change the language', st: ['Press the language button at the top of the page and pick one.'] }
    ] },
  { id: 'site-film', a: 'site', t: 'The 2-minute film', w: 'index.html#film', k: 'film video promo 2 minute transcript',
    s: 'A 2-minute film on the home page that plays in your language, with a transcript.',
    subs: [
      { id: 'play', h: 'Watch it', st: ['On the home page press play on the film. "Read the film" shows the transcript.'] }
    ] },
  { id: 'site-contact', a: 'site', t: 'Contact us and book a demo', w: 'contact.html', k: 'contact demo book a demo enquiry email phone',
    s: 'Send a message or book a demo; it reaches the team in 📨 Enquiries.',
    subs: [
      { id: 'send', h: 'Send a message', st: ['Open Contact & demo, fill in the form, tick consent and send.'] }
    ] }
];

// one flat list of searchable sections, for search and for Champ
export function flat() {
  var out = [];
  ARTICLES.forEach(function (a) {
    (a.subs || []).forEach(function (s) { out.push({ id: a.id + '#' + s.id, a: a, s: s }); });
  });
  return out;
}

// simple scored search: title > sub-heading > keywords > summary > steps
export function search(q, max) {
  var words = String(q || '').toLowerCase().replace(/[^\p{L}\p{N}@#.\s-]/gu, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0; });
  if (!words.length) return [];
  var docs = [];
  ARTICLES.forEach(function (a) {
    var T = a.t.toLowerCase(), K = (a.k || '').toLowerCase(), S = a.s.toLowerCase();
    (a.subs || []).forEach(function (s) { docs.push({ a: a, s: s, T: T, K: K, S: S, H: s.h.toLowerCase(), B: (s.st || []).join(' ').toLowerCase() + ' ' + (s.tip || '').toLowerCase() }); });
  });
  var stems = words.map(function (w) { return w.length > 4 ? w.slice(0, w.length - 1) : w; });   // plural or past forms
  var wt = stems.map(function (st) {   // rare words count more than common ones (like "task")
    var n = docs.filter(function (d) { return (d.H + ' ' + d.T + ' ' + d.K + ' ' + d.S + ' ' + d.B).indexOf(st) >= 0; }).length;
    return n ? 1 / (1 + Math.log(n)) : 0;
  });
  var res = [];
  docs.forEach(function (d) {
    var sc = 0;
    stems.forEach(function (st, i) { var x = 0; if (d.H.indexOf(st) >= 0) x += 6; if (d.T.indexOf(st) >= 0) x += 4; if (d.K.indexOf(st) >= 0) x += 3; if (d.S.indexOf(st) >= 0) x += 1; if (d.B.indexOf(st) >= 0) x += 1; sc += x * wt[i]; });
    if (sc > 0) res.push({ id: d.a.id, sub: d.s.id, score: Math.round(sc * 100) / 100, t: d.a.t, h: d.s.h });
  });
  res.sort(function (x, y) { return y.score - x.score; });
  return res.slice(0, max || 10);
}
var STOP = ['the', 'and', 'how', 'do', 'to', 'a', 'an', 'in', 'of', 'on', 'is', 'it', 'my', 'can', 'what', 'where', 'for', 'with', 'i', 'me', 'does', 'this', 'that', 'be', 'or', 'at', 'from', 'you', 'your', 'are', 'there'];

export function byId(id) { return ARTICLES.filter(function (a) { return a.id === id; })[0] || null; }

// an article as plain text (for Champ's prompt)
export function asText(a, subId) {
  return a.t + ': ' + a.s + '\n' + (a.subs || []).filter(function (s) { return !subId || s.id === subId; }).map(function (s) { return '- ' + s.h + ': ' + s.st.join(' ') + (s.tip ? ' Tip: ' + s.tip : ''); }).join('\n') + (a.tip ? '\nTip: ' + a.tip : '');
}

// which article fits the screen you are on (console routes)
export function forRoute(hash) {
  var h = String(hash || '').replace(/^#/, ''), p = h.split('/');
  if (p[0] === 'plan') {
    var tab = p[2] || 'overview', M = { overview: 'overview', schedule: 'gantt-tasks', budget: 'costing', critical: 'critical', board: 'backlog', bom: 'bom', stake: 'stakeholders', scope: 'scope', risks: 'risks', issues: 'issues', contracts: 'contracts', docs: 'documents', comms: 'comms', reports: 'reports', swms: 'swms', change: 'change', lessons: 'lessons', intel: 'project-ai' };
    return M[tab] || 'overview';
  }
  var R = { programs: 'programs', program: 'programs', deps: 'deps-board', portfolio: p[1] === 'summary' ? 'summary' : 'pipeline', projects: p[1] === 'new' ? 'new-project' : 'all-projects', people: p[1] === 'calendar' ? 'calendar' : p[1] === 'workload' ? 'workload' : 'people', me: 'profile', enquiries: 'enquiries', visitors: 'visitors', sql: p[1] === 'ask' ? 'ai-data' : 'reports-data', users: 'users', knowledge: 'knowledge', activity: 'activity', builds: 'builds' };
  return R[p[0]] || 'tour';
}
