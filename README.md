# STUPID RACING

A browser-based 3D arcade racing prototype built with Three.js, Rapier 3D, Vite, Web Audio and LocalStorage.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production preview:

```bash
npm run build
npm run preview
```

## Publish on GitHub Pages

1. Create a GitHub repository. Upload **the contents of this ZIP directly into the repository root**. The root must contain `index.html`, `package.json`, `src/`, and `.github/workflows/deploy.yml` side by side. Do not put them inside another `stupid-racing/` folder.
2. Open **Settings → Pages** and choose **GitHub Actions** as the deployment source. Do not choose “Deploy from a branch” for this Vite project.
3. Open the **Actions** tab. Wait for **Deploy STUPID RACING to GitHub Pages** to finish with a green check. If the workflow is missing, `.github/workflows/deploy.yml` is not in the repository root.
4. Open the URL shown in the successful deploy job. The Vite config automatically uses `/<repository-name>/` for project pages and `/` for `<owner>.github.io` repositories.

## Controls

**Desktop:** `W` / `↑` accelerate, `S` / `↓` brake or reverse, `A` / `←` and `D` / `→` steer, `Space` jump, `Shift` nitro, `E` special ability, `C` drift, `Esc` pause.

**Phone:** rotate to landscape and use the on-screen steering, pedals, jump, nitro, drift and ability controls. Audio starts after the first user interaction, as required by mobile browsers.

## Game systems

- Five main maps with boss encounters; the next map unlocks after defeating the current boss.
- Eight vehicles with different stats and special abilities.
- Vehicle upgrades, paint skins, coins, gems, daily challenge, achievements and local save data.
- Six game modes and seven random road events.
- Enter `1529` in **SECRET CODE** to enable the alternate visual/audio theme and unlock **THE ABYSS**.
- Completing THE ABYSS grants 999,999,999 coins once per save. The reward flag and currency are stored in LocalStorage.

## Notes

- This project downloads its dependencies from npm during `npm install`; the ZIP does not include `node_modules`.
- Save data is local to the browser and can be reset by clearing this site's LocalStorage.
- The game is an arcade prototype; graphics quality scales with device pixel ratio and the scene uses procedural meshes/materials rather than external asset packs.
