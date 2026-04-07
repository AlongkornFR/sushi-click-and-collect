/**
 * lib/printer.js
 * Intégration QZ Tray → Oxhoo TP85 via ESC/POS sur TCP 9100
 *
 * Prérequis côté PC caisse :
 *   1. QZ Tray installé et démarré (https://qz.io/download)
 *   2. Dans QZ Tray > Advanced : "Allow unsigned requests" activé
 *   3. Imprimante TP-85 accessible sur 192.168.10.2:9100
 */

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
const PRINTER_NAME = "TP-85";
const LINE_WIDTH = 42; // caractères par ligne (papier 80mm)

// ── Chargement du script QZ Tray ─────────────────────────────────────────────

let _scriptLoaded = false;

function loadQZScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.qz || _scriptLoaded) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = QZ_CDN;
    script.onload = () => { _scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Impossible de charger le script QZ Tray."));
    document.head.appendChild(script);
  });
}

// ── Connexion / déconnexion ───────────────────────────────────────────────────

export async function connectQZ() {
  await loadQZScript();
  const qz = window.qz;
  if (!qz) throw new Error("QZ Tray non disponible.");

  // Sécurité : mode non signé (configurer QZ Tray en "Allow unsigned")
  qz.security.setCertificatePromise((resolve) => resolve(""));
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise(() => (resolve) => resolve(""));

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
  return qz;
}

export async function disconnectQZ() {
  try {
    if (window.qz?.websocket.isActive()) {
      await window.qz.websocket.disconnect();
    }
  } catch {
    // Silencieux — la déconnexion n'est pas critique
  }
}

export async function isQZAvailable() {
  try {
    await loadQZScript();
    if (!window.qz) return false;

    // Tente une connexion courte pour tester la disponibilité
    qz_security_setup(window.qz);
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }
    return true;
  } catch {
    return false;
  }
}

function qz_security_setup(qz) {
  qz.security.setCertificatePromise((resolve) => resolve(""));
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise(() => (resolve) => resolve(""));
}

// ── Construction du ticket ESC/POS ───────────────────────────────────────────

const ESC = {
  RESET:    "\x1b\x40",
  CENTER:   "\x1b\x61\x01",
  LEFT:     "\x1b\x61\x00",
  RIGHT:    "\x1b\x61\x02",
  BOLD_ON:  "\x1b\x45\x01",
  BOLD_OFF: "\x1b\x45\x00",
  BIG:      "\x1b\x21\x30",   // double hauteur + double largeur
  NORMAL:   "\x1b\x21\x00",
  FEED3:    "\n\n\n",
  CUT:      "\x1d\x56\x41\x03", // GS V A 3 — coupe partielle
};

const SEP = "-".repeat(LINE_WIDTH) + "\n";

function padLine(left, right) {
  const spaces = LINE_WIDTH - left.length - right.length;
  if (spaces <= 0) {
    // Tronque le nom si trop long
    const truncated = left.substring(0, LINE_WIDTH - right.length - 1);
    return truncated + " " + right + "\n";
  }
  return left + " ".repeat(spaces) + right + "\n";
}

function buildTicket(order) {
  const items = order.items || [];
  const total = (order.total_cents / 100).toFixed(2);

  let t = "";

  // Reset + en-tête
  t += ESC.RESET;
  t += ESC.CENTER;
  t += ESC.BIG + ESC.BOLD_ON;
  t += "NOUVELLE COMMANDE\n";
  t += ESC.NORMAL + ESC.BOLD_OFF;
  t += "\n";
  t += ESC.BOLD_ON + `Commande #${order.id}` + ESC.BOLD_OFF + "\n";
  t += "\n";

  // Infos client
  t += ESC.LEFT;
  t += SEP;
  t += `Client  : ${order.full_name}\n`;
  if (order.phone)       t += `Tel     : ${order.phone}\n`;
  if (order.pickup_time) t += `Retrait : ${order.pickup_time}\n`;
  t += SEP;

  // Articles
  items.forEach((it) => {
    const price = `${(it.line_total_cents / 100).toFixed(2)} EUR`;
    const label = `${it.quantity}x ${it.product_name}`;
    t += padLine(label, price);
  });

  t += SEP;

  // Total
  t += ESC.BOLD_ON;
  t += padLine("TOTAL", `${total} EUR`);
  t += ESC.BOLD_OFF;

  // Note
  if (order.notes) {
    t += "\n";
    t += `Note: ${order.notes}\n`;
  }

  // Avance papier + coupe
  t += ESC.FEED3;
  t += ESC.CUT;

  return t;
}

// Convertit une string ESC/POS en base64 (transmission fiable des bytes binaires)
function toBase64(str) {
  const bytes = Array.from(str).map((c) => String.fromCharCode(c.charCodeAt(0) & 0xff));
  return btoa(bytes.join(""));
}

// ── Impression d'une commande ─────────────────────────────────────────────────

export async function printOrder(order) {
  let qz;
  try {
    qz = await connectQZ();
  } catch (e) {
    throw new Error(
      "QZ Tray non détecté. Vérifiez qu'il est démarré sur le PC caisse.\n" + e.message
    );
  }

  try {
    // Résolution de l'imprimante : TP-85 en priorité, sinon défaut système
    let printerName;
    try {
      printerName = await qz.printers.find(PRINTER_NAME);
    } catch {
      printerName = await qz.printers.getDefault();
    }

    if (!printerName) throw new Error("Aucune imprimante trouvée dans QZ Tray.");

    const config = qz.configs.create(printerName);
    const data   = [{ type: "raw", format: "base64", data: toBase64(buildTicket(order)) }];

    await qz.print(config, data);
  } finally {
    await disconnectQZ();
  }
}
