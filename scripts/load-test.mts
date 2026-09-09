// Prueba de carga dry-run: N sesiones concurrentes + M conexiones SSE.
// No sube fotos reales. Uso: npm run load:test [-- --host URL --n 50 --m 20]
// Default: localhost:3000, 50 sesiones, 20 streams.
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "1"];
  }),
);

const HOST = args.host ?? "http://localhost:3000";
const N = Number(args.n ?? 50); // sesiones
const M = Number(args.m ?? 20); // conexiones SSE
const TIMEOUT_MS = 30000;

const started = Date.now();
let sessionsOk = 0;
let streamsOk = 0;
const errors: string[] = [];

const deadline = setTimeout(() => {
  report(true);
  process.exit(1);
}, TIMEOUT_MS);

function report(timedOut = false) {
  clearTimeout(deadline);
  console.log(`\n=== LOAD TEST ${timedOut ? "(TIMEOUT)" : ""} ===`);
  console.log(`host: ${HOST}`);
  console.log(`sesiones: ${sessionsOk}/${N}`);
  console.log(`streams con heartbeat: ${streamsOk}/${M}`);
  console.log(`tiempo: ${Date.now() - started}ms`);
  if (errors.length) console.log("errores:", errors.slice(0, 5));
}

// 1. sesiones: cualquier token largo falla en DB con 403 (esperado) —
// solo medimos que el endpoint responde rápido bajo concurrencia.
async function sessionProbe(i: number) {
  try {
    const t0 = Date.now();
    const res = await fetch(`${HOST}/api/upload/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr: "x".repeat(64) }),
    });
    // 403 = QR inexistente pero endpoint sano; otra cosa = problema
    if (res.status !== 403) errors.push(`session ${i}: status ${res.status}`);
    else sessionsOk++;
    if (Date.now() - t0 > 5000) errors.push(`session ${i}: lenta`);
  } catch (e) {
    errors.push(`session ${i}: ${(e as Error).message}`);
  }
}

// 2. streams: abrir M conexiones SSE y esperar el primer heartbeat.
function streamProbe(i: number): Promise<void> {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    fetch(`${HOST}/api/photos/stream`, { signal: ctrl.signal })
      .then(async (res) => {
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const txt = dec.decode(value);
          if (txt.includes("heartbeat") || txt.includes("connected")) {
            streamsOk++;
            ctrl.abort();
            break;
          }
        }
      })
      .catch(() => errors.push(`stream ${i}: fallo`))
      .finally(resolve);
  });
}

await Promise.all([
  ...Array.from({ length: N }, (_, i) => sessionProbe(i)),
  ...Array.from({ length: M }, (_, i) => streamProbe(i)),
]);

report();
