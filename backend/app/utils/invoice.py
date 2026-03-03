"""Invoice PDF generator using ReportLab with Unicode (DejaVuSans) font support."""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

INVOICE_DIR = os.getenv("INVOICE_DIR", "./invoices")
os.makedirs(INVOICE_DIR, exist_ok=True)

# ── Register DejaVuSans for full Unicode/Romanian diacritics support ──
_FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/dejavu",
    "/usr/share/fonts/truetype",
]

def _find_font(filename: str):
    for d in _FONT_DIRS:
        path = os.path.join(d, filename)
        if os.path.isfile(path):
            return path
    return None

_REGULAR = _find_font("DejaVuSans.ttf")
_BOLD    = _find_font("DejaVuSans-Bold.ttf")

if _REGULAR:
    pdfmetrics.registerFont(TTFont("DejaVuSans", _REGULAR))
if _BOLD:
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", _BOLD))

FONT      = "DejaVuSans"      if _REGULAR else "Helvetica"
FONT_BOLD = "DejaVuSans-Bold" if _BOLD    else "Helvetica-Bold"


def _fmt(minor: int, currency: str = "RON") -> str:
    return f"{minor / 100:.2f} {currency.upper()}"


def _style(name, font=None, size=9, color=None, align=None):
    """Create a ParagraphStyle directly (no inheritance to avoid fontName conflicts)."""
    kwargs = dict(
        fontName=font or FONT,
        fontSize=size,
        leading=size * 1.4,
        spaceAfter=0,
        spaceBefore=0,
    )
    if color:
        kwargs["textColor"] = color
    if align is not None:
        kwargs["alignment"] = align
    return ParagraphStyle(name, **kwargs)


def generate_invoice_pdf(order, company=None) -> str:
    """
    Generate a PDF invoice for the given order.
    `company` is an optional CompanySettings ORM object (or None / dict).
    Returns the file path.
    """
    os.makedirs(INVOICE_DIR, exist_ok=True)
    # BUG-29: sanitizeaza invoice_no pentru a preveni path traversal
    import re as _re
    safe_no = _re.sub(r"[^A-Za-z0-9\-_]", "_", str(order.invoice_no or "unknown"))
    filepath = os.path.join(INVOICE_DIR, f"factura_{safe_no}.pdf")

    doc = SimpleDocTemplate(
        filepath, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    normal   = _style("N")
    bold     = _style("B",  font=FONT_BOLD)
    small    = _style("S",  size=8, color=colors.grey)
    title    = _style("T",  font=FONT_BOLD, size=18, color=colors.HexColor("#1e3a5f"))
    hdr_cell = _style("HC", font=FONT_BOLD, size=9, color=colors.white)
    bold11   = _style("B11", font=FONT_BOLD, size=11)

    # Helper to get company attribute safely
    def co(attr):
        if company is None:
            return ""
        if isinstance(company, dict):
            return company.get(attr) or ""
        return getattr(company, attr, None) or ""

    story = []

    # ── Header: company info on left, invoice info on right ──
    company_lines = [
        Paragraph("RXP CUSTOM3D", title),
        Paragraph("3D Print Shop", small),
    ]
    # Company fiscal details
    if co("name"):
        company_lines.append(Paragraph(f"Denumire: {co('name')}", normal))
    else:
        company_lines.append(Paragraph("Denumire: ___________________________", normal))
    if co("cif"):
        company_lines.append(Paragraph(f"CIF: {co('cif')}", normal))
    else:
        company_lines.append(Paragraph("CIF: ___________________________", normal))
    if co("reg_com"):
        company_lines.append(Paragraph(f"Reg. Com.: {co('reg_com')}", normal))
    else:
        company_lines.append(Paragraph("Reg. Com.: ___________________________", normal))
    if co("address"):
        company_lines.append(Paragraph(f"Adres\u0103: {co('address')}", normal))
    else:
        company_lines.append(Paragraph("Adres\u0103: ___________________________", normal))
    if co("bank_account"):
        company_lines.append(Paragraph(f"IBAN: {co('bank_account')}", normal))
    else:
        company_lines.append(Paragraph("IBAN: ___________________________", normal))

    created_str = ""
    if order.created_at:
        try:
            created_str = order.created_at.strftime("%d.%m.%Y %H:%M")
        except Exception:
            created_str = str(order.created_at)

    invoice_lines = [
        Paragraph("&nbsp;", _style("SP", size=18)),  # spacer to align with title
        Paragraph(f"<b>FACTUR\u0102</b>", _style("FT", font=FONT_BOLD, size=14)),
        Paragraph(f"Nr.: {order.invoice_no or '-'}", normal),
        Paragraph(f"Data: {created_str}", normal),
        Paragraph(f"Nr. comand\u0103: #{order.id}", normal),
    ]

    header_tbl = Table(
        [[company_lines, invoice_lines]],
        colWidths=[10*cm, 6.5*cm],
    )
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ALIGN",  (1,0), (1,-1),  "RIGHT"),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563eb")))
    story.append(Spacer(1, 0.5*cm))

    # ── Client info ──
    story.append(Paragraph("Client &amp; Livrare", bold))
    story.append(Spacer(1, 0.15*cm))
    story.append(Paragraph(f"Nume: {order.customer_name or '-'}", normal))
    story.append(Paragraph(f"Telefon: {order.customer_phone or '-'}", normal))
    story.append(Paragraph(f"Adres\u0103: {order.customer_address or '-'}", normal))
    story.append(Spacer(1, 0.5*cm))

    # ── Products table (with TVA 21% breakdown) ──
    story.append(Paragraph("Produse", bold))
    story.append(Spacer(1, 0.2*cm))

    currency = order.currency or "RON"
    TVA_RATE = 0.21  # 21%

    def excl_tva(price_incl: int) -> int:
        """Return price excl. TVA from an inclusive price (minor units)."""
        return round(price_incl / (1 + TVA_RATE))

    def tva_amount(price_incl: int) -> int:
        return price_incl - excl_tva(price_incl)

    prod_header = [[
        Paragraph("Nr.",              hdr_cell),
        Paragraph("Produs",           hdr_cell),
        Paragraph("Cant.",            hdr_cell),
        Paragraph("Pre\u021b f\u0103r\u0103 TVA", hdr_cell),
        Paragraph("TVA 21%",          hdr_cell),
        Paragraph("Total cu TVA",     hdr_cell),
    ]]
    prod_rows = []
    total_excl = 0
    total_tva  = 0
    total_incl = 0

    for idx, oi in enumerate(order.items, 1):
        name     = oi.product.name if oi.product else f"#{oi.product_id}"
        qty      = oi.quantity
        # unit prices are stored inclusive of TVA
        unit_incl = oi.unit_price
        unit_excl = excl_tva(unit_incl)
        unit_tva  = unit_incl - unit_excl

        line_excl = unit_excl * qty
        line_tva  = unit_tva  * qty
        line_incl = unit_incl * qty

        total_excl += line_excl
        total_tva  += line_tva
        total_incl += line_incl

        prod_rows.append([
            Paragraph(str(idx),                     normal),
            Paragraph(name,                          normal),
            Paragraph(str(qty),                      normal),
            Paragraph(_fmt(unit_excl, currency),     normal),
            Paragraph(_fmt(unit_tva,  currency),     normal),
            Paragraph(_fmt(line_incl, currency),     normal),
        ])

    prod_tbl = Table(
        prod_header + prod_rows,
        colWidths=[0.8*cm, 6*cm, 1.2*cm, 3*cm, 2.5*cm, 3*cm],
        repeatRows=1,
    )
    prod_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#2563eb")),
        ("FONTSIZE",      (0, 0), (-1, -1), 8.5),
        ("ALIGN",         (2, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(prod_tbl)
    story.append(Spacer(1, 0.4*cm))

    # ── Totals (TVA breakdown) ──
    shipping    = order.shipping_fee_minor or 0
    grand_total = total_incl + shipping

    totals = Table([
        [Paragraph("Subtotal f\u0103r\u0103 TVA:", normal),
         Paragraph(_fmt(total_excl, currency), normal)],
        [Paragraph("TVA 21%:", normal),
         Paragraph(_fmt(total_tva, currency), normal)],
        [Paragraph("Transport (incl. TVA):", normal),
         Paragraph(_fmt(shipping, currency), normal)],
        [Paragraph("TOTAL de plat\u0103:", bold11),
         Paragraph(_fmt(grand_total, currency), bold11)],
    ], colWidths=[5*cm, 3*cm], hAlign="RIGHT")
    totals.setStyle(TableStyle([
        ("ALIGN",        (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE",    (0, 3), (-1, 3),  1, colors.black),
        ("LINEABOVE",    (0, 1), (-1, 1),  0.5, colors.HexColor("#cccccc")),
        ("LINEABOVE",    (0, 2), (-1, 2),  0.5, colors.HexColor("#cccccc")),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    story.append(totals)
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Paragraph("Mul\u021bumim pentru comand\u0103! \u2022 RXPCUSTOM3D", small))

    doc.build(story)
    return filepath

