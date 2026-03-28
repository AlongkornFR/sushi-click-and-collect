export function formatEUR(value) {
  return (Number(value) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
