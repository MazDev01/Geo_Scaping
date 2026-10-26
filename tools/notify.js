// Show a Windows toast notification. Usage: require("./notify")(title, body)  or  node tools/notify.js "title" "body"
const { execFileSync } = require("child_process");

function notify(title, body) {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "''");
  const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${esc(title)}</text><text>${esc(body)}</text></binding></visual><audio src="ms-winsoundevent:Notification.Default"/></toast>')
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;
  // -EncodedCommand (UTF-16LE base64) keeps Thai text intact
  const enc = Buffer.from(ps, "utf16le").toString("base64");
  try { execFileSync("powershell", ["-NoProfile", "-EncodedCommand", enc], { stdio: "ignore", timeout: 30000 }); } catch {}
}

module.exports = notify;
if (require.main === module) notify(process.argv[2] || "ทดสอบ", process.argv[3] || "");
