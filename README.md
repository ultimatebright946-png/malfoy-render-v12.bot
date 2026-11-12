# Malfoy — WhatsApp quest bot (Render)

## Deploy
1. Push this folder to a GitHub repo.
2. Render → New → Blueprint (reads `render.yaml`).
3. Set env vars: `PAIRING_NUMBER` (e.g. 2348101234567) or `QR_KEY`, optional `GROQ_API_KEY`, `OWNER_NUMBER`.
4. Open the Logs → `PAIRING CODE: XXXX-XXXX` → WhatsApp → Linked devices → Link with phone number.
   (or open `https://<app>.onrender.com/qr?key=<QR_KEY>` and scan)
5. Keep the disk. On the free plan (no disk) the login and all player data reset on every restart.

## Optional images (drop into `media/`, jpg/png)
`menu`, `shop`, `tagall`, `zone_crossroads`, `zone_greenpath`, `zone_fungal`, `zone_city`, `zone_deepnest`, `zone_abyss`,
`boss_crossroads`, `boss_greenpath`, `boss_fungal`, `boss_city`, `boss_deepnest`, `boss_abyss`.
Without them the bot uses online anime art / text.

## Website (same service, same address)
Open your Render URL. Players sign in with a code from the bot: send `.weblogin` in a private chat (in a group the code is sent to the DM).
On the site they can change their name and profile picture (upload or gallery), buy gear and see the global leaderboard. `.profile` in WhatsApp shows the website picture.
Set `PUBLIC_URL` to your site address (e.g. https://malfoy-bot.onrender.com) so the bot shows the right link.
Uploaded pictures are saved in `DATA_DIR/uploads`, so keep the Render disk.

## Highlights
- `.animedna` your anime character percentages (re-roll once a day) • `.profile` full profile with website picture
- `.sm` random character + show + image, `.pursue` to win them (charm gear raises your chance), `.charm`
- `.kill [@user]` image from a killing-show character, `.hug .kiss .slap ...` anime gifs
- `.infogc` group picture + full info, `.pfp @user`
- `.play <song>` image card + audio together
- `.exp` XP breakdown • `.shop leveling|attraction|nails|armor|charms`
- Quests: `.map .explore .boss .rest .quests .accept .charms .equip .gear`
