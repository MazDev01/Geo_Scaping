// Province queue (priority order) + keyword generation. Phuket and Bangkok are done separately.
// [Thai name, search name, coastal, areas to split (empty = province-level only)]
const P = [
  // Tier 1: tourism / expat hubs
  ["เชียงใหม่", "Chiang Mai", false, ["Mueang Chiang Mai", "Nimman", "Old City Chiang Mai", "Hang Dong", "San Sai", "Mae Rim", "Doi Saket", "San Kamphaeng", "Saraphi", "Mae Taeng"]],
  ["ชลบุรี", "Chonburi", true, ["Pattaya", "Jomtien", "Na Kluea", "Bang Lamung", "Si Racha", "Mueang Chonburi", "Bang Saen", "Sattahip", "Ban Bueng", "Phan Thong"]],
  ["สุราษฎร์ธานี", "Surat Thani", true, ["Koh Samui", "Chaweng", "Lamai", "Bophut", "Mae Nam", "Koh Phangan", "Koh Tao", "Mueang Surat Thani", "Don Sak", "Khao Sok"]],
  ["กระบี่", "Krabi", true, ["Ao Nang", "Krabi Town", "Klong Muang", "Railay", "Koh Lanta", "Nopparat Thara", "Khlong Thom"]],
  ["ประจวบคีรีขันธ์", "Prachuap Khiri Khan", true, ["Hua Hin", "Pranburi", "Khao Takiab", "Mueang Prachuap Khiri Khan", "Sam Roi Yot", "Bang Saphan"]],
  ["พังงา", "Phang Nga", true, ["Khao Lak", "Takua Pa", "Mueang Phang Nga", "Koh Yao", "Thai Mueang", "Natai"]],
  // Tier 2: Bangkok metro + economic cities
  ["นนทบุรี", "Nonthaburi", false, ["Mueang Nonthaburi", "Pak Kret", "Bang Yai", "Bang Bua Thong", "Bang Kruai", "Sai Noi"]],
  ["สมุทรปราการ", "Samut Prakan", true, ["Mueang Samut Prakan", "Bang Phli", "Bang Bo", "Phra Pradaeng", "Bang Sao Thong", "Phra Samut Chedi"]],
  ["ปทุมธานี", "Pathum Thani", false, ["Mueang Pathum Thani", "Rangsit", "Thanyaburi", "Lam Luk Ka", "Khlong Luang", "Lat Lum Kaeo"]],
  ["ระยอง", "Rayong", true, ["Mueang Rayong", "Ban Chang", "Ban Phe", "Pluak Daeng", "Klaeng", "Mae Ram Phueng"]],
  ["สงขลา", "Songkhla", true, ["Hat Yai", "Mueang Songkhla", "Sadao", "Chana"]],
  ["เชียงราย", "Chiang Rai", false, ["Mueang Chiang Rai", "Mae Sai", "Chiang Saen", "Mae Chan"]],
  // Tier 3: secondary tourism / regional centres
  ["ตราด", "Trat", true, []], ["กาญจนบุรี", "Kanchanaburi", false, []], ["พระนครศรีอยุธยา", "Ayutthaya", false, []],
  ["ขอนแก่น", "Khon Kaen", false, []], ["นครราชสีมา", "Nakhon Ratchasima", false, ["Mueang Nakhon Ratchasima", "Pak Chong", "Khao Yai"]],
  ["อุดรธานี", "Udon Thani", false, []], ["เพชรบุรี", "Phetchaburi", true, []], ["ชุมพร", "Chumphon", true, []],
  ["ตรัง", "Trang", true, []], ["สตูล", "Satun", true, []], ["ระนอง", "Ranong", true, []],
  ["นครศรีธรรมราช", "Nakhon Si Thammarat", true, []], ["แม่ฮ่องสอน", "Mae Hong Son", false, []], ["จันทบุรี", "Chanthaburi", true, []],
  ["นครปฐม", "Nakhon Pathom", false, []], ["สมุทรสาคร", "Samut Sakhon", true, []], ["ฉะเชิงเทรา", "Chachoengsao", true, []],
  ["พิษณุโลก", "Phitsanulok", false, []], ["อุบลราชธานี", "Ubon Ratchathani", false, []], ["หนองคาย", "Nong Khai", false, []],
  ["เลย", "Loei", false, []], ["สุโขทัย", "Sukhothai", false, []], ["น่าน", "Nan", false, []],
  // Tier 4: remaining provinces
  ["ลำปาง", "Lampang", false, []], ["ลำพูน", "Lamphun", false, []], ["แพร่", "Phrae", false, []], ["พะเยา", "Phayao", false, []],
  ["อุตรดิตถ์", "Uttaradit", false, []], ["ตาก", "Tak", false, []], ["กำแพงเพชร", "Kamphaeng Phet", false, []], ["พิจิตร", "Phichit", false, []],
  ["เพชรบูรณ์", "Phetchabun", false, []], ["นครสวรรค์", "Nakhon Sawan", false, []], ["อุทัยธานี", "Uthai Thani", false, []], ["ชัยนาท", "Chai Nat", false, []],
  ["สิงห์บุรี", "Sing Buri", false, []], ["อ่างทอง", "Ang Thong", false, []], ["ลพบุรี", "Lopburi", false, []], ["สระบุรี", "Saraburi", false, []],
  ["สุพรรณบุรี", "Suphan Buri", false, []], ["ราชบุรี", "Ratchaburi", false, []], ["สมุทรสงคราม", "Samut Songkhram", true, []], ["นครนายก", "Nakhon Nayok", false, []],
  ["ปราจีนบุรี", "Prachinburi", false, []], ["สระแก้ว", "Sa Kaeo", false, []], ["บุรีรัมย์", "Buriram", false, []], ["สุรินทร์", "Surin", false, []],
  ["ศรีสะเกษ", "Sisaket", false, []], ["ยโสธร", "Yasothon", false, []], ["อำนาจเจริญ", "Amnat Charoen", false, []], ["มุกดาหาร", "Mukdahan", false, []],
  ["นครพนม", "Nakhon Phanom", false, []], ["สกลนคร", "Sakon Nakhon", false, []], ["กาฬสินธุ์", "Kalasin", false, []], ["ร้อยเอ็ด", "Roi Et", false, []],
  ["มหาสารคาม", "Maha Sarakham", false, []], ["ชัยภูมิ", "Chaiyaphum", false, []], ["หนองบัวลำภู", "Nong Bua Lamphu", false, []], ["บึงกาฬ", "Bueng Kan", false, []],
  ["พัทลุง", "Phatthalung", false, []], ["ปัตตานี", "Pattani", true, []], ["ยะลา", "Yala", false, []], ["นราธิวาส", "Narathiwat", true, []],
];

const BASE = ["5 star hotel", "luxury resort", "boutique hotel", "pool villa", "villa rental", "villa management company", "tour agency",
  "water sports", "kayak tour", "dive center", "international school", "kindergarten", "daycare", "summer camp", "kids camp",
  "coworking space", "digital nomad hub", "muay thai camp", "gym", "yoga studio", "wellness center", "condominium",
  "real estate agency", "property management", "consulate", "โรงแรม", "resort"];
const SEA_ONLY = new Set(["water sports", "dive center"]);
const SPLIT = ["โรงแรม", "resort", "pool villa", "villa management", "tour agency", "gym", "muay thai", "yoga",
  "real estate agency", "condominium", "kindergarten", "coworking space"];

function keywords([, en, coastal, areas]) {
  const out = BASE.filter(k => coastal || !SEA_ONLY.has(k)).map(k => `${k} ${en} Thailand`);
  for (const c of SPLIT) for (const a of areas) out.push(`${c} ${a} ${en}`);
  return out;
}

module.exports = { P, keywords };
