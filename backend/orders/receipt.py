import io
from fpdf import FPDF


def generate_receipt_pdf(order) -> bytes:
    items = list(order.items.all())

    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # ── En-tête ──────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 22)
    pdf.cell(0, 10, "Su-Rice", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, "Click & Collect  |  Cannes, Alpes-Maritimes", ln=True)
    pdf.cell(0, 5, "contact@su-rice.com", ln=True)
    pdf.ln(6)

    # ── Ligne de séparation ───────────────────────────────────
    pdf.set_draw_color(220, 220, 220)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    # ── Infos commande ────────────────────────────────────────
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, f"Recu de commande  #{order.id}", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)

    created = order.created_at.strftime("%d/%m/%Y a %H:%M")
    pdf.cell(0, 6, f"Date         : {created}", ln=True)
    pdf.cell(0, 6, f"Client       : {order.full_name}", ln=True)
    pdf.cell(0, 6, f"Email        : {order.email}", ln=True)
    pdf.cell(0, 6, f"Telephone    : {order.phone}", ln=True)
    pdf.cell(0, 6, f"Heure retrait: {order.pickup_time}", ln=True)
    if order.notes:
        pdf.cell(0, 6, f"Notes        : {order.notes}", ln=True)
    pdf.ln(6)

    # ── Tableau articles ──────────────────────────────────────
    pdf.set_fill_color(245, 245, 245)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 10)

    col_w = [90, 25, 35, 35]
    headers = ["Article", "Qte", "Prix unit.", "Total"]
    for i, h in enumerate(headers):
        align = "L" if i == 0 else "R"
        pdf.cell(col_w[i], 8, h, border="B", align=align, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)

    for item in items:
        unit = item.unit_price_cents / 100
        total = item.line_total_cents() / 100
        name = item.product_name[:45]
        pdf.cell(col_w[0], 7, name, align="L")
        pdf.cell(col_w[1], 7, str(item.quantity), align="R")
        pdf.cell(col_w[2], 7, f"{unit:.2f} EUR", align="R")
        pdf.cell(col_w[3], 7, f"{total:.2f} EUR", align="R")
        pdf.ln()

    # ── Total ─────────────────────────────────────────────────
    pdf.ln(4)
    pdf.set_draw_color(180, 180, 180)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 0, 0)
    total_eur = order.total_cents / 100
    pdf.cell(0, 8, f"TOTAL  :  {total_eur:.2f} EUR", align="R", ln=True)

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(0, 5, "Paiement effectue en ligne  |  Merci pour votre commande !", ln=True, align="C")

    buffer = io.BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()