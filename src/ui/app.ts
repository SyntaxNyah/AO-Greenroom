// The single-page wizard: import → emotes & motions → camera → export.
// Deliberately linear and default-everything so a non-technical creator can go
// from "a folder of MMD files" to "a finished AO2 3D character" in one pass.

import type { CameraRig, GreenroomProject, Pose } from "../model/project";
import { newProject, parseProject, serializeProject } from "../model/project";
import { serializeCameraRig } from "../export/cameraJson";
import { buildCharacterFolder, type CharFile } from "../export/folder";
import { buildZip } from "../export/zip";
import { hasErrors, validateProject, type Issue } from "../export/validate";
import { guessMotionRole, motionStem } from "../stage/motionLibrary";
import type { MmdStage } from "../stage/mmdStage";
import { parsePmxTexturePaths } from "../stage/pmxTextures";
import type { TextureAsset } from "../stage/referenceFiles";
import { button, clear, downloadBytes, el } from "./dom";
import { diagnosticsDump } from "./diagnostics";

const SHOT_PRESETS: Array<{ name: string; pose: Pose }> = [
  { name: "Full body", pose: { targetY: 0.57, distance: 2.3, yaw: 0, pitch: 0 } },
  { name: "Waist up", pose: { targetY: 0.72, distance: 1.35, yaw: 0, pitch: 0 } },
  { name: "Headshot", pose: { targetY: 0.85, distance: 0.8, yaw: 0, pitch: 0 } },
  { name: "Low drama", pose: { targetY: 0.6, distance: 2.0, yaw: 0, pitch: -8 } },
  { name: "High drama", pose: { targetY: 0.4, distance: 2.6, yaw: 0, pitch: 14 } },
  { name: "Over shoulder", pose: { targetY: 0.6, distance: 1.8, yaw: 24, pitch: 0 } },
];

const readFile = (file: File): Promise<Uint8Array> =>
  file.arrayBuffer().then((b) => new Uint8Array(b));

async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const out: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

async function entryToFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return [file];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllEntries(reader);
    console.log(`[app]     dir "${entry.fullPath || entry.name}": ${children.length} children`);
    const files: File[] = [];
    for (const child of children) files.push(...(await entryToFiles(child)));
    return files;
  }
  return [];
}

/** Collects dropped files, preserving folder structure via webkitGetAsEntry
 *  (so `Texture2D/tex.png` keeps its relative path) and falling back to the
 *  flat `files` list on browsers without it. */
async function getFilesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = Array.from(dt.items ?? []);
  const flat = Array.from(dt.files ?? []);
  console.log(`[app] drop: ${items.length} items, ${flat.length} dt.files`);

  const files: File[] = [];
  const seen = new Set<string>();
  const add = (file: File): void => {
    const key = `${file.name}::${file.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      files.push(file);
    }
  };

  const first = items[0];
  if (first && typeof first.webkitGetAsEntry === "function") {
    // DataTransfer items are only valid during the synchronous part of the
    // drop event, so capture every entry up front - before any await - then
    // traverse them asynchronously. Otherwise later items (e.g. a folder
    // dropped alongside the .pmx) get dropped from the result.
    const entries: FileSystemEntry[] = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        console.log(`[app]   entry: ${entry.isDirectory ? "dir" : "file"} "${entry.fullPath || entry.name}"`);
        entries.push(entry);
      } else {
        console.log(`[app]   item: webkitGetAsEntry -> null (kind=${item.kind}, type=${item.type})`);
      }
    }
    for (const entry of entries) {
      for (const file of await entryToFiles(entry)) add(file);
    }
  }

  // Merge the flat dt.files list so folder contents are never lost when
  // webkitGetAsEntry is missing (Firefox) or the traversal comes up short.
  for (const file of flat) add(file);

  console.log(`[app]   merged ${files.length} files`);
  return files;
}

export class App {
  private stage: MmdStage | null = null;
  private project: GreenroomProject = newProject();
  private motionFiles = new Map<string, File>();
  private modelFile: File | null = null;
  private textureFiles = new Map<string, File>();
  private selectedEmote: string | null = null;
  private motionWarnings: string[] = [];
  private mirrorMotion = false;

  private canvas!: HTMLCanvasElement;
  private hint!: HTMLDivElement;
  private emoteList!: HTMLDivElement;
  private cameraPanel!: HTMLDivElement;
  private status!: HTMLDivElement;
  private issuesBox!: HTMLDivElement;

  constructor(root: HTMLElement) {
    const header = el("header");
    const title = el("h1");
    title.append("AO-", el("span", "accent", "Greenroom"));
    header.appendChild(title);
    header.appendChild(el("span", "credits", "MMD rigger for AO2/webAO"));
    const spacer = el("span", "spacer");
    header.appendChild(spacer);
    header.appendChild(button("Open project", () => this.openProject()));
    header.appendChild(button("Save project", () => this.saveProject()));
    header.appendChild(button("Export character", () => this.exportCharacter(), "primary"));
    const copyLogsBtn = button("Copy logs", () => void this.copyLogs(copyLogsBtn));
    header.appendChild(copyLogsBtn);
    root.appendChild(header);

    const main = el("main");
    const sidebar = el("aside", "sidebar");
    sidebar.appendChild(this.buildImportSection());
    sidebar.appendChild(this.buildEmoteSection());
    sidebar.appendChild(this.buildCameraSection());
    sidebar.appendChild(this.buildExportSection());
    main.appendChild(sidebar);

    const viewport = el("section", "viewport");
    this.canvas = el("canvas");
    this.hint = el("div", "stage-hint");
    this.hint.append(
      el("strong", undefined, "Drop your model to begin"),
      el("span", undefined, ".pmx + .vmd motions + textures"),
    );
    viewport.appendChild(this.canvas);
    viewport.appendChild(this.hint);
    main.appendChild(viewport);
    root.appendChild(main);

    this.renderEmotes();
    this.renderCamera();
    this.renderStatus();
  }

  private buildImportSection(): HTMLElement {
    const section = el("section");
    section.appendChild(el("h2", undefined, "1 · Import"));

    const drop = el("div", "drop");
    drop.append(
      el("strong", undefined, "Drop a folder here"),
      el("div", undefined, "the .pmx model, its textures, and any .vmd motions"),
    );
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("over");
      if (e.dataTransfer) void this.onDrop(e.dataTransfer);
    });
    drop.addEventListener("click", () => this.pickFiles());

    section.appendChild(drop);

    const actions = el("div", "import-actions");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";
    actions.appendChild(button("Browse folder...", () => this.pickFolder(), "small"));
    actions.appendChild(button("Browse files...", () => this.pickFiles(), "small"));
    section.appendChild(actions);

    const tip = el("div", "hint");
    tip.append("Tip: use ");
    tip.appendChild(el("b", undefined, "Browse folder..."));
    tip.append(
      " to import a model plus its textures and motions reliably - it uploads the whole folder including subfolders (dragging folders is inconsistent across browsers).",
    );
    section.appendChild(tip);

    const mirrorRow = el("label", "hint");
    const mirrorCheck = document.createElement("input");
    mirrorCheck.type = "checkbox";
    mirrorCheck.title =
      "Flip the motion horizontally for models that are mirrored left/right vs standard MMD (experimental).";
    mirrorRow.append(mirrorCheck, " Mirror motion (experimental)");
    mirrorCheck.addEventListener("change", () => {
      this.mirrorMotion = mirrorCheck.checked;
      this.stage?.setMirrorMotion(this.mirrorMotion);
    });
    section.appendChild(mirrorRow);

    this.status = el("div", "hint");
    section.appendChild(this.status);
    return section;
  }

  private buildEmoteSection(): HTMLElement {
    const section = el("section");
    const head = el("div", "row");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.justifyContent = "space-between";
    head.appendChild(el("h2", undefined, "2 · Emotes"));
    const headActions = el("div");
    headActions.style.display = "flex";
    headActions.style.gap = "6px";
    headActions.appendChild(button("+ Add emote", () => this.addEmote(), "small"));
    headActions.appendChild(button("■ Stop", () => this.stopMotion(), "small"));
    head.appendChild(headActions);
    section.appendChild(head);
    this.emoteList = el("div");
    section.appendChild(this.emoteList);
    return section;
  }

  private buildCameraSection(): HTMLElement {
    const section = el("section");
    section.appendChild(el("h2", undefined, "3 · Camera"));
    this.cameraPanel = el("div");
    section.appendChild(this.cameraPanel);
    return section;
  }

  private buildExportSection(): HTMLElement {
    const section = el("section");
    section.appendChild(el("h2", undefined, "4 · Export"));
    section.appendChild(button("Export character", () => this.exportCharacter(), "primary"));
    section.appendChild(
      el(
        "div",
        "hint",
        "Zips a character folder (char.ini + camera.json + model + motions) ready to drop into AO2/webAO.",
      ),
    );
    this.issuesBox = el("div", "issues");
    section.appendChild(this.issuesBox);
    return section;
  }

  private pickFiles(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    input.addEventListener("change", () => {
      this.onFiles(Array.from(input.files ?? []));
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  private pickFolder(): void {
    const input = document.createElement("input");
    input.type = "file";
    // Recursively reads every file in the chosen folder and sets
    // webkitRelativePath (e.g. "Texture2D/tex.png") in all browsers.
    input.setAttribute("webkitdirectory", "");
    input.style.display = "none";
    input.addEventListener("change", () => {
      this.onFiles(Array.from(input.files ?? []));
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  private async onFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    console.log(`[app] dropped ${files.length} files: ${files.map((f) => f.name).join(", ")}`);

    const model = files.find((f) => /\.pmx$/i.test(f.name));
    const motions = files.filter((f) => /\.vmd$/i.test(f.name));
    const others = files.filter((f) => !/\.(pmx|vmd)$/i.test(f.name));

    // Accumulate dropped textures (folder drops included) so they can be
    // applied to a model loaded now or in a later drop.
    for (const other of others) {
      const rel = other.webkitRelativePath || other.name;
      this.textureFiles.set(rel, other);
    }

    if (model) {
      this.modelFile = model;
      this.project.character.model = model.name;
      await this.ensureStage();
      if (this.stage) {
        this.hint.style.display = "none";
        try {
          const textures = await this.resolveTextures(model);
          console.log(`[app] model "${model.name}" -> ${textures.length} textures from ${this.textureFiles.size} accumulated`);
          await this.stage.loadModel(model, textures);
          this.applyPose(this.stage.autoFrame());
          this.project.cameraRig.default = this.stage.autoFrame();
        } catch (err) {
          console.error("[app] could not load model:", err);
          this.renderStatus([{ severity: "error", message: `Could not load model: ${String(err)}` }]);
        }
      }
    } else if (others.length > 0 && this.modelFile && this.stage?.ready) {
      // Textures dropped on their own: re-apply them to the loaded model.
      try {
        const textures = await this.resolveTextures(this.modelFile);
        console.log(`[app] re-applying ${textures.length} textures to loaded model`);
        await this.stage.loadModel(this.modelFile, textures);
        this.applyPose(this.stage.autoFrame());
      } catch (err) {
        console.error("[app] could not re-apply textures:", err);
        this.renderStatus([{ severity: "error", message: `Could not apply textures: ${String(err)}` }]);
      }
    }

    this.motionWarnings = [];
    for (const motion of motions) {
      const stem = motionStem(motion.name);
      this.motionFiles.set(stem, motion);
      if (this.stage) {
        try {
          const info = await this.stage.loadMotion(motion);
          console.log(`[app] motion loaded: "${stem}" (${info.durationMs}ms)`);
          if (info.bindableBones === 0 && info.totalBones > 0 && this.modelFile) {
            const msg = `Motion "${stem}" matches 0 of ${info.totalBones} bones - it was likely made for a different model.`;
            this.motionWarnings.push(msg);
            console.warn(`[app] ${msg}`);
          }
          const existing = this.project.motions.find((m) => m.stem === stem);
          if (existing) existing.durationMs = info.durationMs;
          else {
            this.project.motions.push({
              file: motion.name,
              stem,
              role: guessMotionRole(motion.name),
              durationMs: info.durationMs,
            });
          }
        } catch (err) {
          console.error(`[app] could not load motion "${motion.name}":`, err);
        }
      }
    }

    if (motions.length > 0) {
      this.autoAssignMotions();
      this.playIdleMotion();
    }
    this.renderEmotes();
    this.renderCamera();
    this.renderStatus();
  }

  private async onDrop(dt: DataTransfer): Promise<void> {
    const files = await getFilesFromDataTransfer(dt);
    await this.onFiles(files);
  }

  /** Maps the model's referenced texture paths to the dropped texture files,
   *  matching by basename so the `Texture2D/` subfolder is handled correctly. */
  private async resolveTextures(model: File): Promise<TextureAsset[]> {
    const files = Array.from(this.textureFiles.values());
    const byBasename = new Map<string, File>();
    for (const file of files) {
      const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
      const base = rel.split("/").pop() ?? file.name;
      if (!byBasename.has(base.toLowerCase())) byBasename.set(base.toLowerCase(), file);
    }

    let paths: string[] | null = null;
    try {
      paths = parsePmxTexturePaths(await model.arrayBuffer());
    } catch {
      paths = null;
    }

    if (paths && paths.length > 0) {
      const assets: TextureAsset[] = [];
      for (const path of paths) {
        const base = path.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
        const file = byBasename.get(base);
        if (file) assets.push({ path, file });
      }
      if (assets.length > 0) return assets;
    }

    return files.map((file) => ({ path: file.webkitRelativePath || file.name, file }));
  }

  private async ensureStage(): Promise<void> {
    if (this.stage) return;
    const { createStage } = await import("../stage/mmdStage");
    this.stage = await createStage(this.canvas);
    this.stage.setOrbit(true);
    if (this.mirrorMotion) this.stage.setMirrorMotion(true);
  }

  private autoAssignMotions(): void {
    const stems = Array.from(this.motionFiles.keys());
    if (stems.length === 0) return;
    const used = new Set<string>();
    for (const emote of this.project.emotes) {
      if (this.motionFiles.has(emote.anim)) {
        used.add(emote.anim);
        continue;
      }
      const want = emote.key.toLowerCase();
      const match =
        stems.find((s) => guessMotionRole(`${s}.vmd`) === want && !used.has(s)) ??
        stems.find((s) => !used.has(s));
      if (match) {
        emote.anim = match;
        used.add(match);
      }
    }
  }

  private motionSelect(current: string | null, includeNone: boolean): HTMLSelectElement {
    const sel = document.createElement("select");
    if (includeNone) {
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "(none)";
      sel.appendChild(none);
    }
    const stems = new Set(this.motionFiles.keys());
    if (current) stems.add(current);
    for (const stem of [...stems].sort()) {
      const opt = document.createElement("option");
      opt.value = stem;
      opt.textContent = stem;
      sel.appendChild(opt);
    }
    sel.value = current ?? "";
    return sel;
  }

  private renderEmotes(): void {
    clear(this.emoteList);
    this.project.emotes.forEach((emote, index) => {
      const row = el("div", "emote-row");

      const top = el("div", "row");
      const keyInput = el("input");
      keyInput.type = "text";
      keyInput.value = emote.key;
      keyInput.title = "Block name (used as the motion file name)";
      keyInput.addEventListener("change", () => {
        const next = keyInput.value.trim() || emote.key;
        if (next !== emote.key) emote.key = next;
        this.renderEmotes();
        this.renderCamera();
      });
      const nameInput = el("input");
      nameInput.type = "text";
      nameInput.value = emote.name;
      nameInput.title = "Button label";
      nameInput.addEventListener("change", () => {
        emote.name = nameInput.value.trim();
      });
      top.append(keyInput, nameInput);
      top.appendChild(button("×", () => {
        this.project.emotes.splice(index, 1);
        if (this.selectedEmote === emote.key) this.selectedEmote = null;
        this.renderEmotes();
        this.renderCamera();
        this.renderStatus();
      }, "danger small"));
      row.appendChild(top);

      const loopRow = el("div", "row");
      const loopSel = this.motionSelect(emote.anim, false);
      loopSel.title = "Loop motion (idle + talking)";
      loopSel.addEventListener("change", () => {
        emote.anim = loopSel.value;
        this.renderStatus();
      });
      loopRow.append(el("span", undefined, "Loop"), loopSel);
      row.appendChild(loopRow);

      const preRow = el("div", "row");
      const preSel = this.motionSelect(emote.preanim, true);
      preSel.title = "Intro motion (optional one-shot)";
      preSel.addEventListener("change", () => {
        emote.preanim = preSel.value || null;
        this.renderStatus();
      });
      preRow.append(el("span", undefined, "Intro"), preSel);
      row.appendChild(preRow);

      const previewActions = el("div", "row");
      previewActions.appendChild(button("▶ Play", () => {
        if (emote.anim) this.playMotion(emote.anim, true);
      }, "small"));
      previewActions.appendChild(button("Frame camera", () => {
        this.selectedEmote = emote.key;
        this.renderCamera();
      }, "small"));
      row.appendChild(previewActions);

      this.emoteList.appendChild(row);
    });
  }

  private renderCamera(): void {
    clear(this.cameraPanel);

    const emote = this.project.emotes.find((e) => e.key === this.selectedEmote) ?? null;
    if (emote) {
      this.cameraPanel.appendChild(el("div", "hint", `Framing "${emote.key}" — drag to orbit, scroll to zoom.`));
      this.cameraPanel.appendChild(button(`Set "${emote.key}" loop`, () => this.capturePose("loop"), "small"));
      this.cameraPanel.appendChild(button(`Set "${emote.key}" intro`, () => this.capturePose("preanim"), "small"));
    } else {
      this.cameraPanel.appendChild(el("div", "hint", "Drag to orbit · scroll to zoom. Pick an emote's \"Frame camera\" to rig it, or set the default below."));
    }

    this.cameraPanel.appendChild(button("Set default shot", () => this.capturePose("default"), "small"));
    this.cameraPanel.appendChild(button("Auto-frame", () => this.autoFrame(), "small"));

    const grid = el("div", "preset-grid");
    for (const preset of SHOT_PRESETS) {
      grid.appendChild(button(preset.name, () => this.applyPose(preset.pose), "small"));
    }
    this.cameraPanel.appendChild(grid);

    const adv = el("details");
    adv.appendChild(el("summary", undefined, "Advanced (camera.json)"));
    const ta = el("textarea");
    ta.value = serializeCameraRig(this.project.cameraRig);
    adv.appendChild(ta);
    adv.appendChild(button("Apply camera.json", () => this.applyCameraJson(ta.value), "small"));
    this.cameraPanel.appendChild(adv);
  }

  private renderStatus(issues?: Issue[]): void {
    const list = issues ?? validateProject(this.project);
    const motionIssues: Issue[] = this.motionWarnings.map((m) => ({ severity: "warning", message: m }));
    const shown = [...motionIssues, ...list];
    const parts = [
      this.modelFile ? `Model: ${this.project.character.model}` : "No model yet",
      `${this.project.emotes.length} emote(s)`,
      `${this.motionFiles.size} motion(s)`,
    ];
    this.status.textContent = parts.join(" · ");

    clear(this.issuesBox);
    if (shown.length === 0) {
      this.issuesBox.appendChild(el("div", "hint", "Ready to export."));
      return;
    }
    for (const issue of shown) {
      const mark = issue.severity === "error" ? "✗" : "!";
      this.issuesBox.appendChild(el("div", issue.severity, `${mark} ${issue.message}`));
    }
  }

  private capturePose(target: "default" | "loop" | "preanim"): void {
    if (!this.stage) return;
    const pose = this.stage.currentPose();
    if (target === "default") {
      this.project.cameraRig.default = pose;
    } else {
      const key = this.selectedEmote;
      if (!key) return;
      this.project.cameraRig.emotes ??= {};
      const entry = this.project.cameraRig.emotes[key] ??= {};
      entry[target] = pose;
    }
    this.renderCamera();
    this.renderStatus();
  }

  private applyPose(pose: Pose): void {
    this.stage?.applyPose(pose);
  }

  /** Plays a motion by stem for live preview. */
  private async playMotion(stem: string, loop: boolean): Promise<void> {
    try {
      await this.stage?.playMotion(stem, loop);
    } catch (err) {
      console.error(`[app] playMotion("${stem}") failed:`, err);
    }
  }

  /** Stops the current motion and returns the model to its rest pose. */
  private stopMotion(): void {
    this.stage?.stopMotion();
  }

  /** Copies the captured diagnostics log to the clipboard for easy sharing. */
  private async copyLogs(btn: HTMLButtonElement): Promise<void> {
    const text = diagnosticsDump();
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied ✓";
    } catch {
      downloadBytes("ao-greenroom-logs.txt", new TextEncoder().encode(text), "text/plain");
      btn.textContent = "Downloaded ✓";
    }
    setTimeout(() => {
      btn.textContent = "Copy logs";
    }, 1600);
  }

  /** Auto-plays the idle emote's loop motion so the model animates on import. */
  private playIdleMotion(): void {
    if (!this.stage?.ready) return;
    const idle = this.project.emotes.find(
      (e) => e.key.toLowerCase() === "idle" && this.motionFiles.has(e.anim),
    );
    if (idle) void this.playMotion(idle.anim, true);
  }

  private autoFrame(): void {
    if (!this.stage) return;
    const pose = this.stage.autoFrame();
    this.stage.applyPose(pose);
    this.project.cameraRig.default = pose;
    this.renderCamera();
    this.renderStatus();
  }

  private applyCameraJson(text: string): void {
    try {
      this.project.cameraRig = JSON.parse(text) as CameraRig;
      this.renderCamera();
      this.renderStatus();
    } catch (err) {
      this.renderStatus([{ severity: "error", message: `Invalid camera.json: ${String(err)}` }]);
    }
  }

  private addEmote(): void {
    const key = `emote_${this.project.emotes.length + 1}`;
    this.project.emotes.push({
      key,
      name: key,
      anim: key,
      preanim: null,
      sound: null,
      soundDelayMs: null,
      deskmod: null,
      modifier: null,
    });
    this.renderEmotes();
    this.renderStatus();
  }

  private saveProject(): void {
    const text = serializeProject(this.project);
    const name = this.project.character.name.trim() || "character";
    downloadBytes(`${name}.greenroom.json`, new TextEncoder().encode(text), "application/json");
  }

  private openProject(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        this.project = parseProject(await file.text());
        this.selectedEmote = null;
        this.renderEmotes();
        this.renderCamera();
        this.renderStatus([
          { severity: "warning", message: "Re-drop the model and motions to continue editing." },
        ]);
      } catch (err) {
        this.renderStatus([{ severity: "error", message: `Could not open project: ${String(err)}` }]);
      }
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  private async exportCharacter(): Promise<void> {
    const issues = validateProject(this.project);
    this.renderStatus(issues);
    if (hasErrors(issues)) return;

    const assets: CharFile[] = [];
    if (this.modelFile) {
      assets.push({ path: this.project.character.model, data: await readFile(this.modelFile) });
    }

    const emitted = new Set<string>();
    for (const emote of this.project.emotes) {
      const loop = this.motionFiles.get(emote.anim);
      if (loop && !emitted.has(emote.anim)) {
        assets.push({ path: `${emote.anim}.vmd`, data: await readFile(loop) });
        emitted.add(emote.anim);
      }
      if (emote.preanim) {
        const pre = this.motionFiles.get(emote.preanim);
        if (pre && !emitted.has(emote.preanim)) {
          assets.push({ path: `${emote.preanim}.vmd`, data: await readFile(pre) });
          emitted.add(emote.preanim);
        }
      }
    }
    for (const [rel, file] of this.textureFiles) {
      assets.push({ path: rel, data: await readFile(file) });
    }

    const folder = buildCharacterFolder({
      character: this.project.character,
      emotes: this.project.emotes,
      cameraRig: this.project.cameraRig,
      assets,
    });

    const zip = buildZip(folder.map((f) => ({ name: f.path, data: f.data })));
    const name = this.project.character.name.trim() || "character";
    downloadBytes(`${name}.zip`, zip, "application/zip");
    this.renderStatus();
  }
}
