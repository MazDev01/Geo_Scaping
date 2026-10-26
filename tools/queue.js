// Run every province in tools/provinces.js one after another. Safe to restart: finished provinces are skipped.
// Usage: node tools/queue.js
const fs = require("fs"), path = require("path"), { execFileSync, spawnSync } = require("child_process");
const { P, keywords } = require("./provinces");
const notify = () => {}; // toast disabled: user wants chat updates only
const root = path.join(__dirname, "..");
const base = path.join(root, "จังหวัด");
const statusFile = path.join(base, "สถานะคิว.txt");
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const scraperRunning = () => {
  try { return execFileSync("tasklist", ["/FI", "IMAGENAME eq gmaps-scraper.exe"]).toString().includes("gmaps-scraper.exe"); }
  catch { return false; }
};
const online = () => {
  try { execFileSync("curl", ["-s", "-m", "15", "-o", "NUL", "-f", "https://www.google.com/maps"], { stdio: "ignore" }); return true; }
  catch { return false; }
};
const waitOnline = () => {
  if (online()) return;
  log("อินเทอร์เน็ตหลุด รอจนกว่าจะกลับมา...");
  notify("⚠️ อินเทอร์เน็ตหลุด", "การกวาดหยุดรอ จะทำต่อเองเมื่อเน็ตกลับมา");
  while (!online()) sleep(2 * 60 * 1000);
  log("อินเทอร์เน็ตกลับมาแล้ว ทำต่อ");
};
const log = msg => {
  const line = `${new Date().toLocaleString("th-TH")}  ${msg}`;
  console.log(line);
  fs.appendFileSync(statusFile, line + "\r\n");
};

fs.mkdirSync(base, { recursive: true });

// Never run two scrapers at once (e.g. Bangkok still going)
while (scraperRunning()) { console.log("Another scrape is running, waiting 5 min..."); sleep(5 * 60 * 1000); }

// Bangkok first (run.js only builds bangkok-all.xlsx once every keyword is searched)
if (!fs.existsSync(path.join(root, "bangkok-done.txt"))) {
  log("เริ่ม/ทำต่อ กรุงเทพ");
  spawnSync(process.execPath, [path.join(__dirname, "run.js"), "keywords-bangkok.txt", "bangkok"], { cwd: root, stdio: "inherit" });
  log("เสร็จ กรุงเทพ");
  sleep(10 * 60 * 1000);
}

P.forEach((p, i) => {
  const [th] = p;
  const dir = path.join(base, `${String(i + 1).padStart(2, "0")} ${th}`);
  const done = path.join(dir, "เสร็จแล้ว.txt");
  if (fs.existsSync(done)) return;
  fs.mkdirSync(dir, { recursive: true });
  const kwFile = path.join(dir, "keywords.txt");
  fs.writeFileSync(kwFile, keywords(p).join("\n") + "\n");
  const prefix = path.relative(root, path.join(dir, th));

  for (let attempt = 1; attempt <= 3; attempt++) {
    waitOnline();
    log(`เริ่ม ${th} (${keywords(p).length} คำค้น) รอบที่ ${attempt}`);
    spawnSync(process.execPath, [path.join(__dirname, "run.js"), path.relative(root, kwFile), prefix], { cwd: root, stdio: "inherit" });
    const raw = path.join(root, `${prefix}-raw.csv`);
    const rows = fs.existsSync(raw) ? fs.readFileSync(raw, "utf8").split("\n").length - 2 : 0;
    if (fs.existsSync(path.join(root, `${prefix}-done.txt`))) {
      fs.writeFileSync(done, `เสร็จ ${new Date().toLocaleString("th-TH")} ได้ข้อมูลดิบ ${rows} แถว\r\n`);
      log(`เสร็จ ${th}: ${rows} แถว`);
      const doneCount = P.filter((x, j) => fs.existsSync(path.join(base, `${String(j + 1).padStart(2, "0")} ${x[0]}`, "เสร็จแล้ว.txt"))).length;
      const next = P[i + 1] ? P[i + 1][0] : "-";
      notify(`✅ กวาดเสร็จ: ${th}`, `${rows} ร้าน · เสร็จแล้ว ${doneCount}/75 จังหวัด · ถัดไป: ${next}`);
      break;
    }
    // Not complete: internet outage or Google block. Back off and retry.
    log(`${th} ยังไม่ครบ (เน็ตหลุดหรือโดน Google บล็อก) พัก 60 นาทีแล้วลองใหม่`);
    sleep(60 * 60 * 1000);
  }
  sleep(10 * 60 * 1000); // short cool-down between provinces
});
log("ครบทุกจังหวัดแล้ว");
notify("🎉 กวาดครบทุกจังหวัดแล้ว", "ไฟล์อยู่ในโฟลเดอร์ gmaps-scraper > จังหวัด");
