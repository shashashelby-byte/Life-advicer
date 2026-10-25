# Life Advicer 🌞🐸🐱🦉🤖

A playful, animated advice site. Five little characters give you daily advice,
powered by **Claude Haiku 5.5** (`claude-haiku-5-5`):

| Character | Topic |
|---|---|
| ☀️ Sunny the sunbeam | Motivation & energy |
| 🐸 Mossy the frog | Mindfulness & slowing down |
| 🐱 Pip the cat | Self-care & boundaries |
| 🦉 Luna the owl | Reflection & the big picture |
| 🤖 Bolt the robot | Productivity & focus |

Features: bobbing/blinking/talking characters, hop-on-click, typewriter speech
bubbles, confetti, floating background, a daily visit streak, a once-a-day
"Today's advice" per character (shared by everyone, cached), and a box to ask
any character a personal question.

## How it runs on Google Sites

Google Sites can't hold secret keys, so the site runs as a **Google Apps Script
web app** (free, hosted by Google) and is embedded into your Google Site. The
Apps Script server holds your Anthropic API key and calls Claude, so the key is
never visible to visitors.

```
Google Site  ──embeds──▶  Apps Script web app (Index.html)
                                 │ google.script.run
                                 ▼
                          Code.gs ──▶ Claude API (claude-haiku-5-5)
                          (API key in Script Properties)
```

## Setup (about 5 minutes)

1. **Create the script** — go to <https://script.google.com>, click **New project**,
   and rename it "Life Advicer".
2. **Add the code**
   - Replace everything in `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
   - Click **+ › HTML**, name it exactly `Index`, and paste in
     [`apps-script/Index.html`](apps-script/Index.html).
   - Open **Project Settings (⚙️)**, tick **Show "appsscript.json" manifest file**,
     then replace that file's contents with
     [`apps-script/appsscript.json`](apps-script/appsscript.json)
     (change `timeZone` to yours so "today" flips at your midnight).
3. **Add your API key** — **Project Settings › Script Properties › Add script property**:
   - Property: `ANTHROPIC_API_KEY`
   - Value: your key from <https://console.anthropic.com> (starts with `sk-ant-`)
4. **Test it** — back in the editor, choose `testSetup` in the function dropdown and
   click **Run**. Approve the permission prompt (it only needs "connect to an
   external service"). You should see Sunny's advice in the execution log.
5. **Deploy** — **Deploy › New deployment › ⚙️ › Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
6. **Put it on Google Sites** — open your site at <https://sites.google.com>,
   then **Insert › Embed › By URL**, paste the `/exec` URL, choose **Whole page**,
   click **Insert**, and drag the box to make it big (about 1000 × 800 works well).
   Click **Publish**.

### Updating later

After editing the code, use **Deploy › Manage deployments › ✏️ › Version: New
version › Deploy**. The URL stays the same, so the Google Site doesn't change.

## Settings you can tweak (top of `Code.gs`)

- `MODEL` — `claude-haiku-5-5`
- `DAILY_ASK_LIMIT` — max personal questions per day across all visitors (default 300),
  so a busy day can't run up a surprise bill. Daily advice is only generated
  once per character per day, no matter how many visitors.
- `CHARACTERS` — each buddy's personality prompt.

## Preview locally

Open `apps-script/Index.html` directly in a browser. Outside Apps Script it
runs in demo mode with canned answers, so you can see the animations without
an API key.
