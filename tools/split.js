// Split gosom raw CSV into one Excel file per topic. Usage: node split.js <raw.csv> <searchmap.tsv> <outDir>
const fs = require("fs"), path = require("path"), ExcelJS = require("exceljs");
const [src, mapFile, outDir] = process.argv.slice(2);

// search job id -> keyword
const kwOf = new Map(fs.readFileSync(mapFile, "utf8").trim().split("\n").map(l => {
  const [id, kw] = l.split("\t");
  return [id, decodeURIComponent(kw.replace(/\+/g, " ")).trim()];
}));

// keyword -> topic (topics follow the user's sheet)
const TOPICS = [
  ["01 โรงแรมแบรนด์ 5 ดาว", k => /^(5 star hotel|luxury resort|luxury hotel) /i.test(k)],
  ["03 บูทีคโฮเทล", k => /^boutique hotel/i.test(k)],
  ["02 โรงแรม-รีสอร์ท-เกสต์เฮาส์ รายพื้นที่", k => /^(hotel|โรงแรม|resort|guest house|hostel) /i.test(k)],
  ["04 พูลวิลล่า", k => /^(pool villa|villa rental)/i.test(k)],
  ["05 Villa Manager", k => /^villa management/i.test(k)],
  ["06 บริษัททัวร์", k => /^tour agency/i.test(k)],
  ["07 กิจกรรมทางน้ำ", k => /^(water sports|kayak tour)/i.test(k)],
  ["08 ศูนย์ดำน้ำ", k => /^dive center/i.test(k)],
  ["09 โรงเรียนนานาชาติ", k => /^international school/i.test(k)],
  ["10 อนุบาล-รับเลี้ยงเด็ก", k => /^(kindergarten|daycare)/i.test(k)],
  ["11 Summer Camp เด็ก", k => /^(summer camp|kids camp)/i.test(k)],
  ["12 Co-working-Digital Nomad", k => /^(coworking space|digital nomad hub)/i.test(k)],
  ["13 ค่ายมวยไทย", k => /^muay thai/i.test(k)],
  ["14 ยิม-โยคะ-Wellness", k => /^(gym|yoga|wellness center)/i.test(k)],
  ["15 คอนโดมิเนียม-นิติบุคคล", k => /^condominium/i.test(k)],
  ["16 นายหน้าอสังหา-ดูแลทรัพย์สิน", k => /^(real estate agency|property management)/i.test(k)],
  ["17 สถานกงสุล-สถานทูต", k => /^((honorary )?consulate|embassy)/i.test(k)],
];
const topicOf = k => (TOPICS.find(([, f]) => f(k)) || ["99 อื่นๆ"])[0];

// CSV parse keeping only needed columns
const NEED = ["input_id", "title", "category", "phone", "website", "emails", "address", "review_rating", "review_count", "latitude", "longitude", "link", "cid"];
const t = fs.readFileSync(src, "utf8");
const rows = [];
let r = [], start = 0, q = false, h = null, keep = null;
const field = end => {
  if (h && !keep.has(r.length)) { r.push(""); return; }
  let v = t.slice(start, end);
  if (v.endsWith("\r")) v = v.slice(0, -1);
  if (v.startsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
  r.push(v);
};
for (let i = 0; i < t.length; i++) {
  const c = t.charCodeAt(i);
  if (q) { if (c === 34) { if (t.charCodeAt(i + 1) === 34) i++; else q = false; } }
  else if (c === 34) q = true;
  else if (c === 44 || c === 10) {
    field(i); start = i + 1;
    if (c === 10) {
      if (!h) { h = r; keep = new Set(NEED.map(n => h.indexOf(n)).filter(x => x >= 0)); }
      else if (r.length > 5) rows.push(r);
      r = [];
    }
  }
}
const ix = n => h.indexOf(n);

const junk = /example|your@|@sentry|wixpress|@domain|\.png|\.jpg|\.webp|test@|email@/i;
const cleanEmails = s => [...new Set(s.split(/[,;\s]+/).filter(e => e.includes("@") && !junk.test(e)))].join(", ");
const seen = new Set();
const d = rows.filter(x => { const k = x[ix("cid")] || x[ix("link")]; if (seen.has(k)) return false; seen.add(k); return true; });

const groups = new Map();
for (const x of d) {
  const kw = kwOf.get(x[ix("input_id")]) || "";
  const tp = topicOf(kw);
  if (!groups.has(tp)) groups.set(tp, []);
  groups.get(tp).push([kw, x]);
}

const cols = [["ชื่อร้าน", "title", 35], ["ประเภท", "category", 18], ["ที่อยู่", "address", 60], ["เบอร์โทร", "phone", 15], ["อีเมล", "emails", 30], ["เว็บไซต์", "website", 35], ["คะแนน", "review_rating", 8], ["จำนวนรีวิว", "review_count", 11], ["คำค้นที่เจอ", "_kw", 28], ["ละติจูด", "latitude", 11], ["ลองจิจูด", "longitude", 11], ["ลิงก์ Google Maps", "link", 30]];

const sheetFor = (wb, name, items) => {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.columns = cols.map(([hd, , w]) => ({ header: hd, width: w }));
  for (const [kw, x] of items) ws.addRow(cols.map(([, k]) => {
    if (k === "_kw") return kw;
    let v = x[ix(k)] || "";
    if (k === "emails") v = cleanEmails(v);
    if (["review_rating", "review_count", "latitude", "longitude"].includes(k) && v) v = Number(v);
    return v;
  }));
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6E43" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: cols.length } };
  ws.getColumn(3).alignment = { wrapText: true, vertical: "top" };
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const summary = [];
  for (const tp of [...groups.keys()].sort()) {
    const items = groups.get(tp);
    const wb = new ExcelJS.Workbook();
    sheetFor(wb, "ข้อมูล", items);
    await wb.xlsx.writeFile(path.join(outDir, `${tp}.xlsx`));
    const has = k => items.filter(([, x]) => k === "emails" ? cleanEmails(x[ix(k)] || "") : x[ix(k)]).length;
    summary.push([tp, items.length, has("phone"), has("emails")]);
  }
  for (const s of summary) console.log(s.join("\t"));
  console.log("total", d.length);
})();
