// Build a clean Excel file from gosom raw CSV. Usage: node make.js <raw.csv> <out.xlsx>
const fs = require("fs"), ExcelJS = require("exceljs");
const [src, dst] = process.argv.slice(2);

const NEED = ["title", "category", "phone", "website", "emails", "address", "review_rating", "review_count", "latitude", "longitude", "link", "cid"];

// Streaming-ish CSV parse that only keeps the columns we need (raw file has huge review columns)
const t = fs.readFileSync(src, "utf8");
const rows = [];
let r = [], start = 0, q = false, h = null, keep = null;
const field = (end) => {
  const col = r.length;
  if (h && !keep.has(col)) { r.push(""); return; }
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

const cols = [["ชื่อร้าน", "title", 35], ["ประเภท", "category", 18], ["ที่อยู่", "address", 60], ["เบอร์โทร", "phone", 15], ["อีเมล", "emails", 30], ["เว็บไซต์", "website", 35], ["คะแนน", "review_rating", 8], ["จำนวนรีวิว", "review_count", 11], ["ละติจูด", "latitude", 11], ["ลองจิจูด", "longitude", 11], ["ลิงก์ Google Maps", "link", 30]];
const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("ข้อมูล");
ws.columns = cols.map(([hd, , w]) => ({ header: hd, width: w }));
for (const x of d) ws.addRow(cols.map(([, k]) => {
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
wb.xlsx.writeFile(dst).then(() => {
  const c = k => d.filter(x => x[ix(k)]).length;
  console.log("rows", d.length, "phone", c("phone"), "web", c("website"), "email", d.filter(x => cleanEmails(x[ix("emails")] || "")).length);
});
