// Un Chrome senza finestra, guidato con il protocollo DevTools (CDP) attraverso il WebSocket di Node:
// serve a provare la versione telefono come gira davvero (moduli ES, service worker, uso offline),
// cosa che jsdom non sa fare. Nessuna dipendenza in più: basta Chrome installato.
//
// Chrome si cerca in CHROME_PATH, poi tra i nomi soliti. Su GitHub Actions (ubuntu-latest) c'è.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Il percorso di Chrome, oppure null se non c'è. */
export function findChrome(): string | null {
  const candidates = [process.env.CHROME_PATH, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter((name): name is string => !!name);
  for (const name of candidates) {
    if (path.isAbsolute(name)) return name;
    const found = spawnSync("which", [name], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return null;
}

interface Pending {
  readonly resolve: (value: Record<string, unknown>) => void;
  readonly reject: (error: Error) => void;
}

export class Chrome {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  private constructor(
    private readonly process: ChildProcess,
    private readonly socket: WebSocket,
    private readonly profile: string,
  ) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown>; error?: { message: string } };
      if (message.id === undefined) return;
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result ?? {});
    });
  }

  /** Avvia Chrome senza finestra, con un profilo vuoto e temporaneo. */
  static async launch(executable: string): Promise<Chrome> {
    const profile = mkdtempSync(path.join(tmpdir(), "compasso-chrome-"));
    const child = spawn(
      executable,
      ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    const url = await new Promise<string>((resolve, reject) => {
      let text = "";
      const timer = setTimeout(() => reject(new Error(`Chrome non risponde:\n${text}`)), 20_000);
      child.stderr?.on("data", (chunk: Buffer) => {
        text += chunk.toString();
        const match = text.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match?.[1]) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      child.on("exit", (code) => reject(new Error(`Chrome si è chiuso (${code}):\n${text}`)));
    });
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", () => reject(new Error("collegamento a Chrome non riuscito")));
    });
    return new Chrome(child, socket, profile);
  }

  /** Un comando del protocollo DevTools (con sessionId, per una pagina). */
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  /** Una scheda nuova con lo schermo di un telefono (di base iPhone XR: 414 × 896, tocco). */
  async newPage(width = 414, height = 896): Promise<ChromePage> {
    const { targetId } = (await this.send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
    const { sessionId } = (await this.send("Target.attachToTarget", { targetId, flatten: true })) as { sessionId: string };
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true }, sessionId);
    await this.send("Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);
    return new ChromePage(this, sessionId);
  }

  async close(): Promise<void> {
    this.socket.close();
    this.process.kill();
    await new Promise((resolve) => setTimeout(resolve, 200));
    rmSync(this.profile, { recursive: true, force: true });
  }
}

export class ChromePage {
  constructor(
    private readonly chrome: Chrome,
    private readonly sessionId: string,
  ) {}

  /** Valuta un'espressione nella pagina (aspettando le promesse) e ne restituisce il valore. */
  async evaluate<T>(expression: string): Promise<T> {
    const result = (await this.chrome.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, this.sessionId)) as {
      result: { value?: T };
      exceptionDetails?: { text: string; exception?: { description?: string } };
    };
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value as T;
  }

  /** Apre un indirizzo e aspetta che la pagina sia caricata. */
  async goto(url: string): Promise<void> {
    await this.chrome.send("Page.navigate", { url }, this.sessionId);
    await this.waitForLoad(url);
  }

  /** Ricarica la pagina e aspetta che sia caricata. */
  async reload(): Promise<void> {
    const url = await this.evaluate<string>("location.href");
    await this.chrome.send("Page.reload", { ignoreCache: false }, this.sessionId);
    await this.waitForLoad(url);
  }

  private async waitForLoad(url: string): Promise<void> {
    const start = Date.now();
    // Subito dopo la richiesta la pagina vecchia può ancora rispondere: si aspetta un documento nuovo.
    await new Promise((resolve) => setTimeout(resolve, 100));
    while (Date.now() - start < 20_000) {
      try {
        if (await this.evaluate<boolean>(`document.readyState === "complete" && location.href === ${JSON.stringify(url)}`)) return;
      } catch {
        // contesto in cambio durante la navigazione: si riprova
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`la pagina ${url} non si carica`);
  }
}
