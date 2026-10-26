// Print scraping progress for Bangkok + the province queue. Usage: node tools/progress.js
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const { P, keywords } = require("./provinces");

const running = (() => {
  try { return execFileSync("tasklist", ["/FI", "IMAGENAME eq gmaps-scraper.exe"]).toString().includes("gmaps-scraper.exe"); }
  catch { return false; }
})();

// searches finished + places found, from a gosom log
function logStats(logFile) {
  if (!fs.existsSync(logFile)) return null;
  const txt = fs.readFileSync(logFile, "utf8");
  const searchIds = new Set();
  for (const m of txt.matchAll(/Job\{ID: ([^,]+), Method: GET, URL: https:\/\/www\.google\.com\/maps\/search\//g)) searchIds.add(m[1]);
  let searches = 0;
  for (const m of txt.matchAll(/"jobid":"([^"]+)"[^\n]*"message":"\d+ places found"/g)) if (searchIds.has(m[1])) searches++;
  const speed = [...txt.matchAll(/"speed":"([^"]+)"/g)].pop();
  const last = fs.statSync(logFile).mtime;
  return { searches, speed: speed ? speed[1] : "-", last };
}
const rawRows = f => fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(l => /^(resume:)?[0-9a-f]{8}/.test(l)).length : 0;
const ago = d => { const m = Math.round((Date.now() - d) / 60000); return m < 60 ? `${m} นาทีที่แล้ว` : `${Math.floor(m / 60)} ชม. ${m % 60} นาทีที่แล้ว`; };
const bar = (n, t) => { const w = 20, f = Math.round((n / t) * w); return "[" + "#".repeat(f) + "-".repeat(w - f) + `] ${Math.round((n / t) * 100)}%`; };

console.log("==================================================");
console.log(` ความคืบหน้าการกวาดข้อมูล  (${new Date().toLocaleString("th-TH")})`);
console.log(` โปรแกรมกวาด: ${running ? "กำลังทำงาน" : "ไม่ได้ทำงาน"}`);
console.log("==================================================");

// Bangkok
const bkkTotal = fs.readFileSync(path.join(root, "keywords-bangkok.txt"), "utf8").trim().split("\n").length;
const bkkDone = fs.existsSync(path.join(root, "bangkok-done.txt"));
const b = logStats(path.join(root, "bangkok-scrape.log"));
console.log(`\nกรุงเทพ: ${bkkDone ? "เสร็จแล้ว" : "กำลังกวาด"}`);
if (b) {
  const rj = path.join(root, "bangkok-raw.csv.resume.json");
  try { b.searches = Math.max(b.searches, JSON.parse(fs.readFileSync(rj, "utf8")).completed_inputs.length); } catch {}
  const sf = path.join(root, "bangkok-searched.txt");
  if (fs.existsSync(sf)) b.searches = Math.max(b.searches, fs.readFileSync(sf, "utf8").split("\n").filter(Boolean).length);
  console.log(`  คำค้น ${b.searches}/${bkkTotal}  ${bar(Math.min(b.searches, bkkTotal), bkkTotal)}`);
  console.log(`  ร้านที่เก็บได้ ~${rawRows(path.join(root, "bangkok-raw.csv"))}   ความเร็ว ${b.speed}   อัปเดตล่าสุด ${ago(b.last)}`);
}

// Provinces
const base = path.join(root, "จังหวัด");
let done = 0, current = null, totalRows = 0;
P.forEach((p, i) => {
  const dir = path.join(base, `${String(i + 1).padStart(2, "0")} ${p[0]}`);
  if (fs.existsSync(path.join(dir, "เสร็จแล้ว.txt"))) { done++; totalRows += rawRows(path.join(dir, `${p[0]}-raw.csv`)); }
  else if (!current && fs.existsSync(path.join(dir, `${p[0]}-scrape.log`))) current = { p, dir };
});
console.log(`\nคิว 75 จังหวัด: เสร็จ ${done}/75  ${bar(done, 75)}   ร้านรวม ~${totalRows}`);
if (current) {
  const s = logStats(path.join(current.dir, `${current.p[0]}-scrape.log`));
  try { s.searches = Math.max(s.searches, JSON.parse(fs.readFileSync(path.join(current.dir, `${current.p[0]}-raw.csv.resume.json`), "utf8")).completed_inputs.length); } catch {}
  const t = keywords(current.p).length;
  console.log(`  กำลังทำ: ${current.p[0]}  คำค้น ${s.searches}/${t}  ${bar(Math.min(s.searches, t), t)}  อัปเดตล่าสุด ${ago(s.last)}`);
} else if (done < 75) console.log("  ยังไม่เริ่ม (รอกรุงเทพเสร็จก่อน)");

const status = path.join(base, "สถานะคิว.txt");
if (fs.existsSync(status)) {
  console.log("\nบันทึกล่าสุดของคิว:");
  fs.readFileSync(status, "utf8").trim().split("\n").slice(-5).forEach(l => console.log("  " + l.trim()));
}
if (running && b && !bkkDone && Date.now() - b.last > 20 * 60000) console.log("\n!! กรุงเทพไม่มีความเคลื่อนไหวเกิน 20 นาที อาจค้าง ลองเช็กหน้าต่างว่ามีคำว่า Select หรือไม่ (กด Esc)");
