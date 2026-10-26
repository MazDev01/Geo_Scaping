// Run gosom scraper for one keyword list until every keyword has actually been searched, then build Excel files.
// gosom can stall (low RAM, slow pages) and exit on inactivity, or hang on exit, so we:
//  - kill it once it logs that it is exiting
//  - re-run it with only the keywords that never got a "places found" result
//  - stop retrying when a pass makes no progress
// Usage: node tools/run.js <keywords.txt> <prefix>   e.g. node tools/run.js keywords-bangkok.txt bangkok
const fs = require("fs"), path = require("path"), { spawn, execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const [kwFile, prefix] = process.argv.slice(2);
const raw = path.join(root, `${prefix}-raw.csv`);
const log = path.join(root, `${prefix}-scrape.log`);
const pending = path.join(root, `${prefix}-pending.txt`);
const searchedFile = path.join(root, `${prefix}-searched.txt`); // survives log loss
const node = process.execPath;
const CONCURRENCY = "2"; // this PC has ~4 GB RAM; 3 browsers starved it
const MAX_STALLED_PASSES = 3;

const allKeywords = fs.readFileSync(path.join(root, kwFile), "utf8").split("\n").map(s => s.trim()).filter(Boolean);
const norm = s => decodeURIComponent(s.replace(/\+/g, " ")).trim().toLowerCase();

// search job id -> keyword, and which keywords got a result, read from the whole log
function readLog() {
  const txt = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
  const idToKw = new Map();
  for (const m of txt.matchAll(/Job\{ID: ([^,]+), Method: GET, URL: https:\/\/www\.google\.com\/maps\/search\/([^,]+),/g)) idToKw.set(m[1], m[2]);
  const searched = new Set();
  for (const m of txt.matchAll(/"jobid":"([^"]+)"[^\n]*"message":"\d+ places found"/g)) if (idToKw.has(m[1])) searched.add(norm(idToKw.get(m[1])));
  if (fs.existsSync(searchedFile)) for (const k of fs.readFileSync(searchedFile, "utf8").split("\n")) if (k.trim()) searched.add(k.trim());
  fs.writeFileSync(searchedFile, [...searched].join("\n") + "\n");
  return { idToKw, searched };
}

function runPass(keywords) {
  fs.writeFileSync(pending, keywords.join("\n") + "\n");
  const startSize = fs.existsSync(log) ? fs.statSync(log).size : 0;
  const out = fs.openSync(log, "a");
  return new Promise(resolve => {
    const child = spawn(path.join(root, "gmaps-scraper.exe"), [
      "-input", pending, "-results", raw, "-resume", "-email", "-lang", "th",
      "-depth", "10", "-c", CONCURRENCY, "-exit-on-inactivity", "15m",
    ], { cwd: root, stdio: ["ignore", out, out] });
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      try { child.kill(); } catch {}
      try { execFileSync("taskkill", ["/IM", "gmaps-scraper.exe", "/F"], { stdio: "ignore" }); } catch {}
      setTimeout(resolve, 3000);
    };
    const timer = setInterval(() => {
      const tail = fs.readFileSync(log).subarray(startSize).toString("utf8").slice(-4000);
      if (/exiting because of inactivity|scrapemate exited/.test(tail)) end();
    }, 30000);
    child.on("exit", end);
  });
}

function build() {
  const { idToKw } = readLog();
  const mapFile = path.join(root, `${prefix}-searchmap.tsv`);
  fs.writeFileSync(mapFile, [...idToKw].map(([a, b]) => `${a}\t${b}`).join("\n") + "\n");
  if (!fs.existsSync(raw)) { console.log("No data collected."); return; }
  const opts = { cwd: root, stdio: "inherit" };
  execFileSync(node, ["--max-old-space-size=2048", path.join(__dirname, "make.js"), raw, path.join(root, `${prefix}-all.xlsx`)], opts);
  execFileSync(node, ["--max-old-space-size=2048", path.join(__dirname, "split.js"), raw, mapFile, path.join(root, `${prefix}-แยกตามหัวข้อ`)], opts);
}

(async () => {
  let stalled = 0;
  for (let pass = 1; ; pass++) {
    const before = readLog().searched;
    const remaining = allKeywords.filter(k => !before.has(k.toLowerCase()));
    console.log(`[${new Date().toLocaleString("th-TH")}] pass ${pass}: ${allKeywords.length - remaining.length}/${allKeywords.length} keywords done, ${remaining.length} to go`);
    if (remaining.length === 0) { fs.writeFileSync(path.join(root, `${prefix}-done.txt`), new Date().toISOString()); break; }
    await runPass(remaining);
    const after = readLog().searched;
    if (after.size > before.size) stalled = 0;
    else if (++stalled >= MAX_STALLED_PASSES) {
      // Only complete if gosom itself has finished ~all inputs (0-result searches log nothing).
      // Otherwise it is a network outage / block: leave no done marker so the queue retries later.
      let gosomDone = 0;
      try { gosomDone = JSON.parse(fs.readFileSync(`${raw}.resume.json`, "utf8")).completed_inputs.length; } catch {}
      if (gosomDone >= allKeywords.length * 0.9) {
        console.log(`No progress, but gosom finished ${gosomDone}/${allKeywords.length}: treating as complete.`);
        fs.writeFileSync(path.join(root, `${prefix}-done.txt`), new Date().toISOString());
      } else {
        console.log(`No progress and gosom finished only ${gosomDone}/${allKeywords.length}: NOT complete (internet down or blocked?).`);
      }
      break;
    }
  }
  console.log("Building Excel files...");
  try { build(); } catch (e) { console.log("Could not write Excel (file open in Excel?). Close it and run: node tools/make.js " + raw); }
  console.log(`DONE: ${prefix}-all.xlsx and folder ${prefix}-แยกตามหัวข้อ`);
  process.exit(0);
})();
