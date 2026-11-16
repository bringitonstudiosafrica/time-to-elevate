# Time to Elevate · Ian Kanyi's 30th

The invitation site for Friday 27 November 2026, 7 PM till midnight.

**What guests go through**
1. **Riddle:** *What goes up but never goes down?* They get hints after wrong answers, and a correct answer (**age**) reveals the A·G·E tiles.
2. **3D invitation folder:** a Three.js folder with a wax seal. Tapping breaks the seal, the cover opens and the Admit One card flies out.
3. **The invitation:** live countdown, the 7-to-midnight clock, the "be on time" note, the Admit One ticket, a WhatsApp link to ask for extra invitations, and the RSVP form.
4. **RSVP:** name and phone go straight into your Google Sheet. If the sheet can't be reached, guests are asked to send their RSVP on WhatsApp instead, so nobody gets lost.

Returning guests skip the riddle and go straight to the folder.

---

## Project layout

```
index.html                  the page
og.jpg                      link-preview image (WhatsApp, iMessage, socials)
assets/css/styles.css       all styles
assets/js/config.js         event details: name, WhatsApp number, date, riddle answers
assets/js/page.js           countdown, clock, gold motes, WhatsApp links, RSVP form
assets/js/intro.js          the 3D invitation folder (Three.js)
assets/js/app.js            flow: riddle → folder → invitation
assets/img/favicon.svg      browser tab icon
api/rsvp.js                 Vercel serverless function: validates RSVPs and writes them to the sheet
google-apps-script/Code.gs  the script that runs inside your Google Sheet
tests/rsvp.test.js          automated tests for the RSVP pipeline (npm test)
vercel.json                 Vercel settings
```

To change any event detail, edit `assets/js/config.js`.

---

## Setup (about 10 minutes)

### 1. Create the Google Sheet

1. Signed in to your Gmail account, go to <https://sheets.new> and name the sheet, for example **Ian's 30th · RSVPs**.
2. Open **Extensions → Apps Script**.
3. Delete the sample code and paste in everything from `google-apps-script/Code.gs`.
4. On the `SECRET` line, replace `CHANGE-ME-to-a-long-random-phrase` with your own long random phrase, for example `elevate-30-kx92-velvet-midnight`. Keep it private.
5. Click **Save**.

### 2. Publish the script as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as:** *Me*, and **Who has access:** *Anyone*.
4. Click **Deploy**, then **Authorize access**. Choose your account. If you see "Google hasn't verified this app", click **Advanced → Go to (project name)** and allow it. It's your own script, so this is expected.
5. Copy the **Web app URL**. It ends in `/exec`.
6. Optional check: open that URL in your browser. You should see `{"ok":true,"service":"Time to Elevate RSVPs"}`.

The **RSVPs** tab and its column headers are created automatically when the first RSVP arrives.

### 3. Deploy to Vercel

**Option A: GitHub (recommended)**
1. Push this folder to a new GitHub repository.
2. On <https://vercel.com/new>, import the repository. There's no framework or build step, so keep the defaults and click **Deploy**.

**Option B: command line**
```bash
npx vercel
```
```bash
npx vercel --prod
```

### 4. Connect the sheet to the site

In Vercel, open **Project → Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `SHEETS_WEBHOOK_URL` | the Web app URL from step 2 (ends in `/exec`) |
| `SHEETS_SECRET` | the exact phrase you set as `SECRET` in Code.gs |

Then go to **Deployments**, open the menu on the latest deployment and choose **Redeploy**. Environment variables only take effect after a redeploy.

### 5. Finish the link preview

WhatsApp needs the full address of the preview image. In `index.html`, change:

```html
<meta property="og:image" content="/og.jpg">
```

to your real domain, for example:

```html
<meta property="og:image" content="https://time-to-elevate.vercel.app/og.jpg">
```

Then redeploy.

### 6. Test it

Open your site, solve the riddle, open the folder, and RSVP with your own name and number. A new row should appear in the sheet within a few seconds. You can delete it afterwards.

To replay the riddle on a device that has already solved it, open the site in a private or incognito window.

---

## The guest list sheet

| Received | Name | Phone | WhatsApp number | Last updated | Times submitted |
|---|---|---|---|---|---|

- **Phone** is exactly what the guest typed. **WhatsApp number** is the cleaned-up version (`0712 345 678` becomes `+254712345678`).
- If the same number RSVPs again, its row is updated instead of duplicated, and **Times submitted** goes up by one.
- To send the venue, tap the **WhatsApp number** on your phone, or open `https://wa.me/254712345678` with their number.

## If something goes wrong

| Symptom | Fix |
|---|---|
| Guests see "We couldn't add you to the guest list online" | The environment variables are missing, or you didn't redeploy after adding them. Check step 4. |
| Rows never appear | Check that **Who has access** is *Anyone* and that `SHEETS_SECRET` matches `SECRET` exactly. Vercel → Project → Logs shows the reason. |
| You changed Code.gs and nothing changed | Apps Script needs **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same. |

## Tests

```bash
npm test
```

This runs the RSVP function against a simulated Google Sheet: new RSVPs, duplicate numbers, invalid input, the spam trap, formula injection, a wrong secret and missing configuration.
