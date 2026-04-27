"""
Genereaza Documentul de Proiectare Arhitecturala (ADD) pentru RXP Custom 3D,
pastrand acelasi design ca Specificatia Cerintelor.
"""
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageBreak, Preformatted
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Proiectare_arhitecturala.pdf")

HEADER_TEXT = "RXP Custom 3D — Proiectare Arhitecturală"


# ---------- inregistrare fonturi Unicode ----------
FONT_CANDIDATES = [
    "C:/Windows/Fonts",
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/dejavu",
]


def _find_font(name: str) -> str:
    for d in FONT_CANDIDATES:
        path = os.path.join(d, name)
        if os.path.isfile(path):
            return path
    return ""


def _register_fonts():
    regular = _find_font("DejaVuSans.ttf")
    bold = _find_font("DejaVuSans-Bold.ttf")
    italic = _find_font("DejaVuSans-Oblique.ttf")
    bold_italic = _find_font("DejaVuSans-BoldOblique.ttf")
    mono = _find_font("DejaVuSansMono.ttf")
    mono_bold = _find_font("DejaVuSansMono-Bold.ttf")

    if not all([regular, bold, italic, bold_italic, mono]):
        print("EROARE: fonturile DejaVu nu au fost gasite.", file=sys.stderr)
        sys.exit(1)

    pdfmetrics.registerFont(TTFont("Body", regular))
    pdfmetrics.registerFont(TTFont("Body-Bold", bold))
    pdfmetrics.registerFont(TTFont("Body-Italic", italic))
    pdfmetrics.registerFont(TTFont("Body-BoldItalic", bold_italic))
    pdfmetrics.registerFont(TTFont("Mono", mono))
    if mono_bold:
        pdfmetrics.registerFont(TTFont("Mono-Bold", mono_bold))

    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    registerFontFamily(
        "Body",
        normal="Body",
        bold="Body-Bold",
        italic="Body-Italic",
        boldItalic="Body-BoldItalic",
    )


_register_fonts()

BASE_FONT = "Body"
BOLD_FONT = "Body-Bold"
ITALIC_FONT = "Body-Italic"
MONO_FONT = "Mono"


# ---------- stiluri ----------
styles = {
    "title": ParagraphStyle(
        "title", fontName=BOLD_FONT, fontSize=24, alignment=TA_CENTER,
        leading=30, spaceAfter=4
    ),
    "subtitle": ParagraphStyle(
        "subtitle", fontName=BOLD_FONT, fontSize=18, alignment=TA_CENTER,
        leading=22, spaceAfter=6
    ),
    "subtitle_it": ParagraphStyle(
        "subtitle_it", fontName=ITALIC_FONT, fontSize=12, alignment=TA_CENTER,
        leading=16, spaceAfter=18
    ),
    "cover_uni": ParagraphStyle(
        "cover_uni", fontName=BASE_FONT, fontSize=12, alignment=TA_CENTER,
        leading=16
    ),
    "cover_meta": ParagraphStyle(
        "cover_meta", fontName=BASE_FONT, fontSize=11, alignment=TA_CENTER,
        leading=15
    ),
    "h1": ParagraphStyle(
        "h1", fontName=BOLD_FONT, fontSize=16, alignment=TA_LEFT,
        leading=20, spaceBefore=14, spaceAfter=8
    ),
    "h2": ParagraphStyle(
        "h2", fontName=BOLD_FONT, fontSize=12, alignment=TA_LEFT,
        leading=16, spaceBefore=10, spaceAfter=5
    ),
    "h3": ParagraphStyle(
        "h3", fontName=BOLD_FONT, fontSize=11, alignment=TA_LEFT,
        leading=14, spaceBefore=6, spaceAfter=3
    ),
    "body": ParagraphStyle(
        "body", fontName=BASE_FONT, fontSize=10, alignment=TA_JUSTIFY,
        leading=14, spaceAfter=4
    ),
    "body_left": ParagraphStyle(
        "body_left", fontName=BASE_FONT, fontSize=10, alignment=TA_LEFT,
        leading=14, spaceAfter=4
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName=BASE_FONT, fontSize=10, alignment=TA_JUSTIFY,
        leading=14, leftIndent=14, bulletIndent=2, spaceAfter=2
    ),
    "toc": ParagraphStyle(
        "toc", fontName=BASE_FONT, fontSize=10, alignment=TA_LEFT,
        leading=16
    ),
    "toc_l2": ParagraphStyle(
        "toc_l2", fontName=BASE_FONT, fontSize=10, alignment=TA_LEFT,
        leading=16, leftIndent=18
    ),
    "toc_l3": ParagraphStyle(
        "toc_l3", fontName=BASE_FONT, fontSize=10, alignment=TA_LEFT,
        leading=16, leftIndent=36
    ),
    "code": ParagraphStyle(
        "code", fontName=MONO_FONT, fontSize=8, alignment=TA_LEFT,
        leading=10, leftIndent=6, spaceAfter=6, spaceBefore=4
    ),
    "td": ParagraphStyle(
        "td", fontName=BASE_FONT, fontSize=9, alignment=TA_LEFT, leading=12
    ),
    "td_bold": ParagraphStyle(
        "td_bold", fontName=BOLD_FONT, fontSize=9, alignment=TA_LEFT, leading=12
    ),
}


# ---------- header / footer pe fiecare pagina ----------
def _header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setFont(ITALIC_FONT, 9)
        canvas.drawRightString(width - 2 * cm, height - 1.3 * cm, HEADER_TEXT)
        canvas.setStrokeColor(colors.grey)
        canvas.setLineWidth(0.4)
        canvas.line(2 * cm, height - 1.5 * cm, width - 2 * cm, height - 1.5 * cm)
    canvas.setStrokeColor(colors.grey)
    canvas.setLineWidth(0.4)
    canvas.line(2 * cm, 1.8 * cm, width - 2 * cm, 1.8 * cm)
    canvas.setFont(BASE_FONT, 9)
    canvas.drawCentredString(width / 2.0, 1.3 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


# ---------- helpers ----------
def _P(text, style="body"):
    return Paragraph(text, styles[style])


def _cell(text, bold=False):
    """Wrap cell text in a Paragraph so it wraps properly."""
    return Paragraph(text, styles["td_bold"] if bold else styles["td"])


def _styled_table(data, col_widths=None, first_row_header=True):
    wrapped = []
    for i, row in enumerate(data):
        if first_row_header and i == 0:
            wrapped.append([_cell(c, bold=True) for c in row])
        else:
            wrapped.append([_cell(c) for c in row])
    t = Table(wrapped, colWidths=col_widths, repeatRows=1 if first_row_header else 0)
    ts = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
    ]
    if first_row_header:
        ts += [
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.90, 0.90, 0.90)),
        ]
    t.setStyle(TableStyle(ts))
    return t


def _pre(text):
    return Preformatted(text, styles["code"])


# ---------- continut ----------
def build_story():
    s = []

    # ========= COVER =========
    s.append(Spacer(1, 4 * cm))
    s.append(_P("Universitatea POLITEHNICA din București", "cover_uni"))
    s.append(_P("Facultatea de Automatică și Calculatoare", "cover_uni"))
    s.append(Spacer(1, 1.2 * cm))
    s.append(_P("Proiectare Arhitecturală", "title"))
    s.append(_P("RXP Custom 3D", "subtitle"))
    s.append(_P("Magazin e-commerce pentru accesorii auto tuning cu imprimare 3D", "subtitle_it"))
    s.append(Spacer(1, 0.3 * cm))
    s.append(_P(
        "<b>Grupa:</b> 332CA &nbsp;|&nbsp; <b>Seria:</b> CA &nbsp;|&nbsp; "
        "<b>Data:</b> Aprilie 2026 &nbsp;|&nbsp; <b>Versiune:</b> 1.0",
        "cover_meta"
    ))
    s.append(PageBreak())

    # ========= CUPRINS =========
    s.append(_P("Cuprins", "h1"))
    toc_entries = [
        ("1. Introducere", 3, "toc"),
        ("1.1. Scopul sistemului", 3, "toc_l2"),
        ("1.2. Definiții, acronime", 3, "toc_l2"),
        ("1.3. Documente referințe", 3, "toc_l2"),
        ("2. Obiective de proiectare", 4, "toc"),
        ("2.1. Obiective funcționale", 4, "toc_l2"),
        ("2.2. Obiective de calitate (nefuncționale)", 4, "toc_l2"),
        ("2.3. Constrângeri și principii arhitecturale", 4, "toc_l2"),
        ("3. Arhitectura propusă", 5, "toc"),
        ("3.1. Decompoziția în subsisteme", 5, "toc_l2"),
        ("3.2. Distribuția pe platforme hardware/software", 8, "toc_l2"),
        ("3.3. Managementul datelor persistente", 9, "toc_l2"),
        ("3.4. Controlul accesului utilizatorilor la sistem", 11, "toc_l2"),
        ("3.5. Fluxul global al controlului", 12, "toc_l2"),
        ("3.6. Tratarea condițiilor limită", 13, "toc_l2"),
        ("Glosar de termeni", 14, "toc"),
    ]
    for title, page, st in toc_entries:
        dots = "." * max(3, 80 - len(title) - len(str(page)))
        s.append(_P(f"{title} {dots} {page}", st))
    s.append(PageBreak())

    # ========= 1. INTRODUCERE =========
    s.append(_P("1. Introducere", "h1"))

    s.append(_P("1.1. Scopul sistemului", "h2"))
    s.append(_P(
        "Prezentul document descrie arhitectura software a platformei <b>RXP Custom 3D</b>, "
        "un magazin online B2C specializat în accesorii auto de tip tuning, cu accent "
        "pe produse fabricate prin imprimare 3D la comandă. Documentul definește "
        "decompoziția în subsisteme, distribuția lor pe platforme hardware/software, "
        "managementul datelor persistente, controlul accesului, fluxul global al "
        "controlului și tratarea condițiilor limită. Scopul este de a oferi echipei de "
        "dezvoltare o referință tehnică completă care transpune cerințele funcționale "
        "și nefuncționale într-o soluție implementabilă, trasabilă și verificabilă.",
        "body"
    ))
    s.append(_P(
        "Arhitectura este de tip <b>multi-tier containerizat</b> (client-server în "
        "trei niveluri: prezentare, logică de business, date), implementată ca "
        "microservicii coordonate prin Docker Compose. Această abordare asigură "
        "separarea responsabilităților, scalabilitate orizontală selectivă și "
        "portabilitate între medii de execuție (dev, staging, prod).",
        "body"
    ))

    s.append(_P("1.2. Definiții, acronime", "h2"))
    defs = [
        ["Termen", "Definiție"],
        ["ADD", "Architectural Design Document — prezentul document"],
        ["API", "Application Programming Interface — interfață REST expusă de backend"],
        ["CI/CD", "Continuous Integration / Continuous Deployment"],
        ["COD", "Cash On Delivery — plată la livrare (ramburs)"],
        ["CORS", "Cross-Origin Resource Sharing"],
        ["DTO", "Data Transfer Object — schemă Pydantic pentru serializare"],
        ["GDPR", "Regulamentul UE 2016/679 privind protecția datelor"],
        ["HTTPS", "HTTP peste TLS 1.2+ (port 443)"],
        ["JWT", "JSON Web Token — transmitere securizată a sesiunilor"],
        ["ORM", "Object-Relational Mapping (SQLAlchemy)"],
        ["RBAC", "Role-Based Access Control — control acces bazat pe roluri"],
        ["REST", "Representational State Transfer — stil arhitectural API"],
        ["SKU", "Stock Keeping Unit — cod unic produs"],
        ["SRS", "Software Requirements Specification (Specificația Cerințelor)"],
        ["TLS", "Transport Layer Security — criptare canal de comunicație"],
        ["TVA", "Taxa pe Valoarea Adăugată"],
        ["UC", "Use Case — caz de utilizare"],
        ["WAL", "Write-Ahead Log (PostgreSQL, mecanism de durabilitate)"],
    ]
    s.append(_styled_table(defs, col_widths=[3.5 * cm, 13 * cm]))

    s.append(_P("1.3. Documente referințe", "h2"))
    refs = [
        ["Cod", "Document / Standard"],
        ["SRS-RXP", "Documentul de specificație a cerințelor — RXP Custom 3D, Martie 2026"],
        ["ISO/IEC/IEEE 42010:2011", "Systems and software engineering — Architecture description"],
        ["RFC 7519", "JSON Web Token (JWT)"],
        ["RFC 8446", "TLS 1.3 — Transport Layer Security"],
        ["OWASP ASVS 4.0", "Application Security Verification Standard"],
        ["Legea 571/2003", "Codul fiscal al României (facturare și TVA)"],
        ["Regulamentul UE 2016/679", "GDPR"],
        ["FastAPI 0.11x", "Documentație oficială framework backend"],
        ["PostgreSQL 15", "Documentație oficială sistem de baze de date"],
        ["Stripe API 2024-06-20", "Documentație oficială procesator plăți"],
    ]
    s.append(_styled_table(refs, col_widths=[5 * cm, 11.5 * cm]))
    s.append(PageBreak())

    # ========= 2. OBIECTIVE DE PROIECTARE =========
    s.append(_P("2. Obiective de proiectare", "h1"))
    s.append(_P(
        "Obiectivele de proiectare derivă direct din cerințele funcționale "
        "(CF-01...CF-12) și nefuncționale (CNF-01...CNF-06) definite în "
        "SRS-RXP. Acestea ghidează deciziile arhitecturale majore și servesc "
        "drept criterii de acceptanță pentru validarea arhitecturii.",
        "body"
    ))

    s.append(_P("2.1. Obiective funcționale", "h2"))
    obf = [
        ["Obiectiv", "Descriere", "Trasabilitate SRS"],
        ["OF-01", "Suport complet pentru ciclul de viață al unei comenzi: catalog, coș, checkout, plată, factură", "CF-01...CF-07"],
        ["OF-02", "Canal dedicat pentru cereri de printare 3D personalizată cu upload STL/OBJ/STEP", "CF-08"],
        ["OF-03", "Panou administrativ pentru gestiune produse, comenzi și setări firmă", "CF-10, CF-11, CF-12"],
        ["OF-04", "Suport dual pentru plată la livrare (COD) și card bancar prin Stripe", "CF-05, CF-06"],
        ["OF-05", "Generare automată factură PDF conformă cu legislația românească", "CF-07"],
    ]
    s.append(_styled_table(obf, col_widths=[2.2 * cm, 10.3 * cm, 4 * cm]))

    s.append(_P("2.2. Obiective de calitate (nefuncționale)", "h2"))
    obnf = [
        ["Obiectiv", "Descriere / criteriu măsurabil", "Trasabilitate"],
        ["OC-01", "Securitate: JWT HttpOnly, bcrypt cost ≥ 12, HTTPS obligatoriu, whitelist extensii upload", "CNF-01"],
        ["OC-02", "Performanță: răspuns API < 500 ms (p95), tranzacții de stoc cu lock pesimist", "CNF-02"],
        ["OC-03", "Disponibilitate: uptime 99.5%, retry DB la startup (max 10 încercări)", "CNF-03"],
        ["OC-04", "Conformitate legală: GDPR, Legea 571/2003, TVA explicit pe factură și produs", "CNF-04"],
        ["OC-05", "Scalabilitate: Docker Compose, PostgreSQL separat de API, servicii independente", "CNF-05"],
        ["OC-06", "Compatibilitate: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+, UI responsive", "CNF-06"],
        ["OC-07", "Mentenabilitate: separație pe router FastAPI, ORM SQLAlchemy, schemă versionată", "Best practice"],
    ]
    s.append(_styled_table(obnf, col_widths=[2.2 * cm, 11.3 * cm, 3 * cm]))

    s.append(_P("2.3. Constrângeri și principii arhitecturale", "h2"))
    s.append(_P(
        "Proiectarea respectă următoarele principii, în ordinea priorității:",
        "body"
    ))
    principii = [
        "<b>Separația responsabilităților</b> — fiecare subsistem are un rol bine definit (prezentare, logică, persistență, securitate periferică);",
        "<b>Stateless API</b> — backend-ul nu menține sesiune în memorie; starea este în JWT (client) și baza de date;",
        "<b>Single Source of Truth</b> — PostgreSQL este singura sursă canonică pentru entități de business (produse, comenzi, utilizatori);",
        "<b>Fail-safe defaults</b> — by default accesul este refuzat; endpoint-urile expun explicit ce roluri sunt acceptate;",
        "<b>Idempotență la webhook-uri</b> — procesarea Stripe se bazează pe payment_intent_id unic, duplicate sunt ignorate;",
        "<b>Observabilitate</b> — logging structurat, health-check endpoint, metrici disponibile pentru monitoring extern;",
        "<b>Portabilitate</b> — Docker Compose asigură paritatea dev/prod și deployment pe orice host Linux.",
    ]
    for p in principii:
        s.append(Paragraph(f"• {p}", styles["bullet"]))
    s.append(PageBreak())

    # ========= 3. ARHITECTURA PROPUSĂ =========
    s.append(_P("3. Arhitectura propusă", "h1"))
    s.append(_P(
        "Arhitectura RXP Custom 3D este organizată în <b>6 subsisteme</b> "
        "independente, fiecare rulat într-un container Docker dedicat sau integrat "
        "prin protocoale standardizate. Comunicarea internă se face prin rețeaua "
        "Docker virtuală, iar expunerea externă se realizează exclusiv prin "
        "reverse proxy-ul Nginx (TLS terminator).",
        "body"
    ))

    # --- 3.1 Decompozitie ---
    s.append(_P("3.1. Decompoziția în subsisteme", "h2"))

    subs = [
        ["ID", "Subsistem", "Tehnologie", "Responsabilitate principală"],
        ["SS-1", "Frontend (Web UI)", "HTML5, CSS3, JavaScript vanilla, Fetch API", "Prezentare, interacțiune cu utilizatorul, validare client"],
        ["SS-2", "Backend API", "FastAPI, Pydantic, SQLAlchemy (Python 3.11)", "Logică de business, validare, autorizare, orchestrare"],
        ["SS-3", "Baza de date", "PostgreSQL 15", "Persistență tranzacțională (ACID), integritate referențială"],
        ["SS-4", "Procesor plăți", "Stripe API (extern, integrat prin SDK)", "Procesare carduri, webhook-uri evenimente plată"],
        ["SS-5", "Generator facturi", "ReportLab (modul Python intern)", "Generare PDF conform legislației fiscale RO"],
        ["SS-6", "Reverse proxy", "Nginx 1.25, OpenSSL", "Terminare TLS, routing, servire statice, rate limiting"],
    ]
    s.append(_styled_table(subs, col_widths=[1.2 * cm, 2.8 * cm, 5.3 * cm, 7.2 * cm]))

    s.append(_P("3.1.1. Subsistemul Frontend (Web UI)", "h3"))
    s.append(_P(
        "<b>Tehnologie:</b> HTML5, CSS3 (flexbox/grid), JavaScript vanilla (ES2020), "
        "Fetch API pentru comunicarea cu backend-ul. Nu se utilizează framework-uri "
        "SPA (React/Vue) pentru a minimiza footprint-ul și a elimina build-step-ul.",
        "body"
    ))
    s.append(_P(
        "<b>Componente:</b> pagini statice (index.html, category.html, product.html, "
        "cart.html, checkout.html, account.html, custom.html, login.html, register.html), "
        "un modul central <i>js/api.js</i> (wrapper fetch cu gestiune token/eroare) "
        "și <i>script.js</i> (logică UI comună: navbar, badge coș, toast notifications).",
        "body"
    ))
    s.append(_P("<b>Interfețe:</b>", "body"))
    for b in [
        "<b>Ieșire</b> către SS-2: HTTP/HTTPS REST (JSON), cu credentials=include pentru cookie JWT;",
        "<b>Intrare</b> de la utilizator: evenimente DOM (click, submit, input);",
        "<b>Integrare</b> cu SS-4: Stripe.js (Stripe Elements) pentru securizarea datelor cardului (PCI-DSS SAQ-A).",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))
    s.append(_P(
        "Frontend-ul este servit static de Nginx (SS-6), fără procesare "
        "server-side; toată logica dinamică rulează în browser.",
        "body"
    ))

    s.append(_P("3.1.2. Subsistemul Backend (API)", "h3"))
    s.append(_P(
        "<b>Tehnologie:</b> FastAPI (ASGI, Uvicorn), Pydantic v2 pentru schemele DTO, "
        "SQLAlchemy 2.x ORM, PyJWT pentru tokens, bcrypt pentru parole.",
        "body"
    ))
    s.append(_P(
        "<b>Pachete interne:</b> "
        "<i>app.routers</i> (auth, products, cart, orders, payments, custom_requests, admin_panel) "
        "— grupare funcțională endpoint-uri; "
        "<i>app.models</i> — entități ORM; "
        "<i>app.schemas</i> — DTO Pydantic; "
        "<i>app.deps</i> — dependențe injectabile (sesiune DB, autentificare); "
        "<i>app.security</i> — primitive cripto (hash, JWT); "
        "<i>app.utils.invoice</i> — wrapper pentru SS-5.",
        "body"
    ))
    s.append(_P("<b>Interfețe:</b>", "body"))
    for b in [
        "<b>Intrare</b>: REST pe <i>/api/*</i>, documentat automat prin OpenAPI 3.1 la <i>/docs</i>;",
        "<b>Ieșire</b> către SS-3: SQL prin driver psycopg2, pool de conexiuni SQLAlchemy;",
        "<b>Ieșire</b> către SS-4: HTTPS REST la api.stripe.com (PaymentIntent, Webhook);",
        "<b>Intrare</b> de la SS-4: webhook POST /api/payments/webhook (semnătura HMAC verificată);",
        "<b>Ieșire</b> către SS-5: apel intra-proces Python (fără overhead de rețea).",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("3.1.3. Subsistemul Date (DB)", "h3"))
    s.append(_P(
        "<b>Tehnologie:</b> PostgreSQL 15 (imagine oficială Docker), stocare pe "
        "volum persistent <i>pgdata</i>. Izolare tranzacțională implicită: "
        "READ COMMITTED; ridicată la SERIALIZABLE pentru checkout cu <i>SELECT ... "
        "FOR UPDATE</i>.",
        "body"
    ))
    s.append(_P(
        "<b>Interfață:</b> port 5432 expus doar în rețeaua Docker internă (nu este "
        "accesibil din exterior); conexiune prin TCP cu user/parolă.",
        "body"
    ))

    s.append(_P("3.1.4. Subsistemul Plată (Stripe)", "h3"))
    s.append(_P(
        "Serviciu SaaS extern. Integrarea respectă fluxul PaymentIntent cu 3D Secure: "
        "(1) backend-ul creează PaymentIntent și returnează <i>client_secret</i>; "
        "(2) frontend-ul confirmă plata prin Stripe Elements; (3) Stripe notifică "
        "backend-ul prin webhook; (4) backend-ul marchează comanda ca plătită "
        "și decrementează stocul.",
        "body"
    ))

    s.append(_P("3.1.5. Subsistemul Facturare (PDF)", "h3"))
    s.append(_P(
        "Modul Python intern <i>app.utils.invoice</i>, bazat pe ReportLab, cu font "
        "DejaVuSans pentru diacritice. Fișierele PDF sunt stocate pe volum Docker "
        "<i>/invoices</i> și servite prin endpoint autentificat <i>/api/orders/"
        "{id}/invoice</i>. Calea este sanitizată împotriva path traversal.",
        "body"
    ))

    s.append(_P("3.1.6. Subsistemul Reverse Proxy (Nginx)", "h3"))
    s.append(_P(
        "<b>Tehnologie:</b> Nginx 1.25 cu OpenSSL. Configurare în "
        "<i>nginx/conf.d/default.conf</i>.",
        "body"
    ))
    s.append(_P("<b>Responsabilități:</b>", "body"))
    for b in [
        "terminare TLS 1.2+ pe port 443, redirect 80 → 443;",
        "servire conținut static (/, /static/, /images/, /js/, frontend HTML);",
        "reverse proxy <i>/api/*</i> → backend:8000 (HTTP intern);",
        "headere de securitate: HSTS, X-Content-Type-Options, X-Frame-Options, CSP;",
        "rate limiting pe <i>/api/auth/login</i> (5 cereri/minut/IP) pentru mitigarea brute-force.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("3.1.7. Diagrama de componente și interfețe", "h3"))
    s.append(_P(
        "Diagrama de componente de nivel înalt (UML 2.5, interfețe provided / required):",
        "body"
    ))
    diagram = (
        "  +-----------------+        HTTPS 443        +-------------------+\n"
        "  | Browser Client  |<------ TLS 1.2+ ------->|   SS-6 Nginx      |\n"
        "  | (SS-1 Frontend) |                         |   Reverse Proxy   |\n"
        "  +-----------------+                         +---------+---------+\n"
        "                                                        |\n"
        "                                      HTTP 8000 (intern)|\n"
        "                                                        v\n"
        "                                      +-------------------------+\n"
        "                                      |    SS-2 Backend API     |\n"
        "                                      |  (FastAPI + Uvicorn)    |\n"
        "                                      | routers/deps/security   |\n"
        "                                      +--+--------+--------+----+\n"
        "                                         |        |        |\n"
        "                              SQLAlchemy |   HTTPS|        | in-process\n"
        "                                         v        v        v\n"
        "                                 +----------+ +--------+ +----------+\n"
        "                                 | SS-3 DB  | | SS-4   | | SS-5     |\n"
        "                                 | Postgres | | Stripe | | Invoice  |\n"
        "                                 +----------+ +--------+ +----------+"
    )
    s.append(_pre(diagram))

    s.append(_P("Interfețele cheie sunt rezumate în tabelul următor:", "body"))
    ifs = [
        ["Interfață", "Furnizor", "Consumator", "Protocol / Format"],
        ["I-Web", "SS-6 Nginx", "Browser utilizator", "HTTPS 443 + HTML/CSS/JS"],
        ["I-Api", "SS-2 Backend", "SS-1 Frontend (via SS-6)", "REST/JSON peste HTTPS"],
        ["I-Db", "SS-3 PostgreSQL", "SS-2 Backend", "TCP 5432 + SQL (SQLAlchemy)"],
        ["I-Pay", "SS-4 Stripe", "SS-2 Backend", "HTTPS REST (Stripe SDK)"],
        ["I-Hook", "SS-2 Backend", "SS-4 Stripe", "HTTPS POST cu semnătură HMAC"],
        ["I-Inv", "SS-5 Invoice", "SS-2 Backend", "Apel funcție Python (intra-proces)"],
        ["I-Fs", "Volum Docker", "SS-2, SS-5", "I/O disk (/uploads, /invoices)"],
    ]
    s.append(_styled_table(ifs, col_widths=[2.3 * cm, 3.2 * cm, 4.5 * cm, 6.5 * cm]))
    s.append(PageBreak())

    # --- 3.2 Distributie hardware/software ---
    s.append(_P("3.2. Distribuția pe platforme hardware/software", "h2"))
    s.append(_P(
        "Sistemul este livrat ca o colecție de containere Docker orchestrate prin "
        "<i>docker-compose.yml</i>. Toate serviciile rulează pe un singur nod "
        "gazdă (single-host deployment) în configurația de bază, cu posibilitate "
        "de migrare la Docker Swarm / Kubernetes pentru scalare viitoare.",
        "body"
    ))

    s.append(_P("Specificații platforme de execuție", "h3"))
    plat = [
        ["Nod", "Hardware minim", "Software", "Servicii rulate"],
        ["Server producție", "2 vCPU, 2 GB RAM, 20 GB SSD", "Ubuntu 22.04+, Docker 24+, Docker Compose v2", "SS-2 (api), SS-3 (db), SS-6 (web)"],
        ["Client (browser)", "Oricărui device desktop/mobil", "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+", "SS-1 (rulează în browser)"],
        ["Stripe Cloud", "N/A (SaaS)", "Gestionat de Stripe Inc.", "SS-4"],
    ]
    s.append(_styled_table(plat, col_widths=[3.3 * cm, 4.2 * cm, 5 * cm, 4 * cm]))

    s.append(_P("Diagrama de distribuție (deployment)", "h3"))
    dep = (
        "  +=============================[ Internet ]============================+\n"
        "  |                                                                      |\n"
        "  |   [Client browser]                            [Stripe Cloud (SaaS)]  |\n"
        "  |     | HTTPS 443                                   ^ HTTPS REST       |\n"
        "  +=====|================================================================+\n"
        "        v\n"
        "  +=======================[ Host Linux (Ubuntu 22.04) ]=================+\n"
        "  |                                                                      |\n"
        "  |   [Docker Engine 24+ / Docker Compose v2]                            |\n"
        "  |                                                                      |\n"
        "  |   +-------------+   +--------------+   +--------------------+        |\n"
        "  |   | web (nginx) |<=>| api (fastapi)|<=>| db (postgres:15)   |        |\n"
        "  |   | :80, :443   |   | :8000 intern |   | :5432 intern       |        |\n"
        "  |   +------+------+   +-------+------+   +---------+----------+        |\n"
        "  |          |                  |                    |                   |\n"
        "  |   vol:certs/           vol:invoices/        vol:pgdata/              |\n"
        "  |   vol:frontend/        vol:uploads/                                  |\n"
        "  +======================================================================+"
    )
    s.append(_pre(dep))

    s.append(_P("Containere și volume", "h3"))
    cont = [
        ["Container", "Imagine de bază", "Porturi expuse", "Volume montate"],
        ["web", "nginx:1.25-alpine", "80, 443 (host)", "./nginx/conf.d, ./nginx/certs, ./frontend"],
        ["api", "python:3.11-slim", "— (doar intern 8000)", "./backend/app, invoices, uploads"],
        ["db", "postgres:15-alpine", "— (doar intern 5432)", "pgdata (named volume)"],
    ]
    s.append(_styled_table(cont, col_widths=[2.3 * cm, 3.5 * cm, 4 * cm, 6.7 * cm]))
    s.append(PageBreak())

    # --- 3.3 Managementul datelor persistente ---
    s.append(_P("3.3. Managementul datelor persistente", "h2"))
    s.append(_P(
        "Persistența este asigurată prin două mecanisme complementare: "
        "<b>bază de date relațională</b> PostgreSQL pentru entități de business "
        "și <b>sistem de fișiere</b> (volume Docker) pentru artefacte binare "
        "(imagini produse, fișiere 3D încărcate, facturi PDF).",
        "body"
    ))

    s.append(_P("Sistemul de baze de date", "h3"))
    s.append(_P(
        "<b>PostgreSQL 15</b> — sistem ACID, cu WAL pentru durabilitate și "
        "replicare streaming disponibilă pentru scenarii HA. Schema este "
        "gestionată declarativ prin SQLAlchemy metadata (<i>create_all</i> la "
        "startup în dev; migrații Alembic recomandate pentru prod).",
        "body"
    ))

    s.append(_P("Schema conceptuală a bazei de date", "h3"))
    tables_desc = [
        ["Tabelă", "Atribute cheie", "Rol"],
        ["users", "id PK, email UNIQUE, password_hash, is_admin, created_at", "Conturi utilizatori (Client/Admin)"],
        ["products", "id PK, sku UNIQUE, name, description, price (bani), currency, stock, is_active, image_url, category, tags[]", "Catalog produse"],
        ["cart_items", "id PK, user_id FK, product_id FK, quantity", "Coș persistent per utilizator"],
        ["orders", "id PK, user_id FK, total_amount (bani), currency, status, shipping_fee_minor, customer_name/phone/address, stripe_payment_intent, invoice_no UNIQUE, created_at", "Antet comandă"],
        ["order_items", "id PK, order_id FK, product_id FK, quantity, unit_price (bani)", "Linii comandă (snapshot preț)"],
        ["custom_requests", "id PK, user_id FK, file_path, file_format, description, status, created_at", "Cereri printare 3D"],
        ["company_settings", "id PK (singleton=1), name, cif, reg_com, address, bank_account", "Date firmă pentru facturare"],
    ]
    s.append(_styled_table(tables_desc, col_widths=[3 * cm, 9.5 * cm, 4 * cm]))

    s.append(_P("Diagrama conceptuală (ER simplificat)", "h3"))
    er = (
        "   +----------+  1       *  +-------------+\n"
        "   |  users   |-------------|  cart_items |\n"
        "   +----+-----+             +------+------+\n"
        "        |1                         |*\n"
        "        |                          v1\n"
        "        |*                   +----------+\n"
        "   +----+-----+  1      *    | products |\n"
        "   |  orders  |--------------+----+-----+\n"
        "   +----+-----+ order_items       |1\n"
        "        |1                        |\n"
        "        |*                        |*\n"
        "   +----+------------+     +------+-----------+\n"
        "   | custom_requests |     | company_settings |\n"
        "   +-----------------+     +------------------+"
    )
    s.append(_pre(er))

    s.append(_P("Convenții și constrângeri", "h3"))
    for b in [
        "<b>Prețuri în unități minore</b> (bani) — evită erori de rotunjire floating-point; conversie la RON doar la afișare;",
        "<b>Chei străine cu ON DELETE RESTRICT</b> pentru comenzi; utilizatorii cu istoric nu pot fi șterși fără anonimizare prealabilă;",
        "<b>Index pe coloane critice</b>: products.sku, products.category, orders.status, orders.created_at, users.email;",
        "<b>Integritate tranzacțională</b> la checkout: <i>SELECT ... FOR UPDATE</i> pe produse înainte de UPDATE stock — elimină race condition;",
        "<b>Invoice numbering monotonic</b> — coloana invoice_no este UNIQUE, generată cu secvență Postgres pentru conformitate fiscală.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("Fișiere (sisteme de fișiere pe volume Docker)", "h3"))
    fs_table = [
        ["Director", "Conținut", "Acces", "Backup"],
        ["pgdata/", "Date PostgreSQL (WAL + heap)", "Numai container <i>db</i>", "pg_dump zilnic (recomandat)"],
        ["/uploads/custom/", "Fișiere STL/OBJ/STEP (max 50 MB)", "Citire: admin; Scriere: API prin CF-08", "Snapshot volum săptămânal"],
        ["/invoices/", "Facturi PDF (r/w API, r autentificat utilizator)", "API + admin", "Snapshot volum săptămânal"],
        ["/static/images/", "Imagini produse (upload admin)", "Citire publică", "Git / snapshot volum"],
    ]
    s.append(_styled_table(fs_table, col_widths=[3.3 * cm, 5.7 * cm, 4 * cm, 3.5 * cm]))
    s.append(PageBreak())

    # --- 3.4 Control acces ---
    s.append(_P("3.4. Controlul accesului utilizatorilor la sistem", "h2"))
    s.append(_P(
        "Controlul accesului este implementat pe trei niveluri: <b>autentificare</b> "
        "(identificare utilizator), <b>autorizare</b> (verificare drepturi) și "
        "<b>protecție periferică</b> (Nginx, TLS, rate limiting).",
        "body"
    ))

    s.append(_P("Roluri și permisiuni", "h3"))
    rbac = [
        ["Rol", "Autentificare", "Permisiuni"],
        ["Vizitator", "Nu", "Browse catalog, vizualizare detalii produs, căutare"],
        ["Client", "Da (JWT utilizator)", "Toate cele ale Vizitatorului + coș, checkout COD/Stripe, cereri 3D, istoric comenzi personal, descărcare facturi proprii"],
        ["Administrator", "Da (JWT + <i>is_admin</i>=true)", "Toate cele ale Clientului + CRUD produse, gestiune comenzi (status update), setări firmă, descărcare orice factură"],
    ]
    s.append(_styled_table(rbac, col_widths=[2.8 * cm, 3.7 * cm, 10 * cm]))

    s.append(_P("Mecanism de autentificare", "h3"))
    for b in [
        "<b>Parole:</b> hash bcrypt cu cost ≥ 12, salt unic per utilizator; verificare cu <i>bcrypt.verify</i> timp constant;",
        "<b>JWT:</b> algoritm HS256, secret stocat în variabila de mediu <i>JWT_SECRET</i> (64+ octeți random); payload minim: <i>sub</i> (user_id), <i>exp</i> (7 zile), <i>iat</i>;",
        "<b>Transport:</b> cookie HttpOnly + Secure + SameSite=Lax, nume <i>auth_token</i>; fallback Bearer token pentru Swagger/clienți API;",
        "<b>Logout:</b> delete cookie client-side; token-ul rămâne valid până la <i>exp</i> (stateless); lista de revocare poate fi adoptată ulterior dacă e necesar.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("Mecanism de autorizare", "h3"))
    s.append(_P("Autorizarea se face prin dependențe FastAPI injectate la nivel de endpoint:", "body"))
    for b in [
        "<i>get_current_user_id</i> — citește JWT din cookie sau Bearer; 401 dacă lipsește sau e expirat;",
        "<i>admin_required</i> — extinde cele de mai sus, verifică <i>is_admin</i>; 403 dacă nu e administrator;",
        "<b>Ownership checks</b> — endpoint-urile de tip <i>/orders/{id}</i> verifică user_id == order.user_id (sau admin) — previne IDOR.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("Protecție periferică", "h3"))
    per = [
        ["Strat", "Mecanism", "Scop"],
        ["Rețea", "TLS 1.2+, HSTS (max-age 1an)", "Confidențialitate și integritate în tranzit"],
        ["Nginx", "Rate limit 5 req/min pe /auth/login", "Mitigare brute-force credentiale"],
        ["Nginx", "Headere CSP, X-Frame-Options, X-Content-Type-Options", "Reducere suprafață XSS / clickjacking"],
        ["API", "CORS whitelist (<i>CORS_ORIGINS</i>)", "Previne accesul din origini neautorizate"],
        ["API", "Validare Pydantic (tipuri, lungimi, pattern)", "Prevenire injection și date malformate"],
        ["Upload", "Whitelist extensii (.stl, .obj, .step), limită 50 MB", "Prevenire upload malware și DoS pe disk"],
    ]
    s.append(_styled_table(per, col_widths=[2.3 * cm, 7 * cm, 7.2 * cm]))
    s.append(PageBreak())

    # --- 3.5 Flux global control ---
    s.append(_P("3.5. Fluxul global al controlului", "h2"))
    s.append(_P(
        "Diagrama de activitate de mai jos descrie fluxul principal end-to-end pentru "
        "un utilizator nou care achiziționează un produs (scenariu nominal): "
        "de la accesarea site-ului până la primirea facturii.",
        "body"
    ))

    activity = (
        "   ( Start: utilizator accesează / )\n"
        "            |\n"
        "            v\n"
        "   [Nginx servește frontend static]\n"
        "            |\n"
        "            v\n"
        "   [Frontend cere GET /api/products]\n"
        "            |\n"
        "            v\n"
        "      <<decizie>> Autentificat?\n"
        "         /               \\\n"
        "        nu                da\n"
        "        |                  |\n"
        "        v                  v\n"
        "  [Register/Login]   [Adaugă în coș POST /api/cart]\n"
        "        |                  |\n"
        "        \\________.________/\n"
        "                 |\n"
        "                 v\n"
        "      <<decizie>> Metodă de plată?\n"
        "         /                 \\\n"
        "       COD                 Card\n"
        "        |                   |\n"
        "        v                   v\n"
        " [POST /orders/       [POST /payments/\n"
        "  checkout-cod]        create-intent]\n"
        "  (SELECT FOR UPDATE,  (Stripe PaymentIntent,\n"
        "   INSERT order)        confirmCardPayment)\n"
        "        |                   |\n"
        "        |                   v\n"
        "        |           [Webhook Stripe]\n"
        "        |                   |\n"
        "        \\_________._________/\n"
        "                  |\n"
        "                  v\n"
        "       [SS-5: generează factura PDF]\n"
        "                  |\n"
        "                  v\n"
        "       [Frontend afișează confirmare]\n"
        "                  |\n"
        "                  v\n"
        "               ( Stop )"
    )
    s.append(_pre(activity))

    s.append(_P("Comunicarea între subsisteme pe cazuri de utilizare", "h3"))
    uc_flow = [
        ["UC", "Traseu control", "Sincron / Asincron"],
        ["UC-01 Auth", "SS-1 → SS-6 → SS-2 → SS-3; răspuns JWT în cookie", "Sincron"],
        ["UC-02 Browse", "SS-1 → SS-6 → SS-2 → SS-3 (SELECT paginat)", "Sincron"],
        ["UC-03 Cart", "SS-1 → SS-2 → SS-3 (INSERT/UPDATE cart_items)", "Sincron"],
        ["UC-04 Checkout COD", "SS-2 → SS-3 (tranz. SELECT FOR UPDATE) → SS-5 (PDF)", "Sincron"],
        ["UC-05 Checkout Stripe", "SS-2 → SS-4 (PaymentIntent) → SS-1 (Elements); apoi SS-4 → SS-2 (webhook) → SS-3 → SS-5", "Hibrid"],
        ["UC-06 Custom 3D", "SS-1 → SS-2 (multipart) → FileSystem + SS-3", "Sincron"],
        ["UC-09 Factură", "SS-2 → SS-5 (intra-proces) → FileSystem", "Sincron"],
    ]
    s.append(_styled_table(uc_flow, col_widths=[3.2 * cm, 10.3 * cm, 3 * cm]))
    s.append(PageBreak())

    # --- 3.6 Tratarea conditiilor limita ---
    s.append(_P("3.6. Tratarea condițiilor limită", "h2"))

    s.append(_P("Pornirea sistemului (startup)", "h3"))
    for b in [
        "<b>docker compose up -d</b> pornește toate cele 3 containere în ordinea declarată (db → api → web) prin <i>depends_on</i>;",
        "<b>API retry DB</b>: la startup, SS-2 rulează un retry exponențial (max 10 încercări, delay crescător) până când PostgreSQL acceptă conexiuni;",
        "<b>Inactivare schemă</b>: dacă tabelele lipsesc, SQLAlchemy <i>create_all</i> le creează (dev); în prod se rulează <i>alembic upgrade head</i>;",
        "<b>Health check</b>: endpoint <i>GET /api/health</i> returnează 200 doar dacă SS-3 este accesibilă; Nginx returnează 503 cât timp API răspunde 5xx.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("Oprirea sistemului (shutdown)", "h3"))
    for b in [
        "<b>Graceful shutdown</b> la SIGTERM: Uvicorn așteaptă finalizarea cererilor active (timeout 30s) înainte de a închide worker-ele;",
        "<b>Tranzacțiile DB</b> în curs sunt fie finalizate, fie rollback-uite automat de PostgreSQL la închiderea conexiunii;",
        "<b>Volumele</b> persistă datele; PostgreSQL face checkpoint la shutdown ordonat pentru a minimiza replay WAL la repornire;",
        "<b>docker compose down</b> păstrează volumele; <i>docker compose down -v</i> <b>șterge</b> datele — rezervat doar pentru reset dev.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))

    s.append(_P("Tratarea condițiilor speciale", "h3"))
    cond = [
        ["Condiție", "Reacția sistemului"],
        ["Stoc insuficient la checkout", "<i>SELECT ... FOR UPDATE</i> detectează conflict; ROLLBACK; API răspunde 409 Conflict cu detaliu stoc disponibil"],
        ["Card refuzat / fonduri insuficiente", "Stripe returnează eroare în confirmCardPayment; frontend afișează mesajul; comanda <b>nu</b> se creează (rely pe webhook)"],
        ["Webhook Stripe duplicat", "Verificare <i>stripe_payment_intent</i> UNIQUE în orders; a doua cerere devine no-op (idempotență)"],
        ["Token JWT expirat", "API returnează 401; frontend redirect la /login cu păstrarea paginii curente (?next=...)"],
        ["Upload 3D peste limită", "Nginx <i>client_max_body_size 60M</i> respinge; fallback API validează dimensiunea și returnează 413"],
        ["Extensie upload neacceptată", "API validează Content-Type și extensie; respinge cu 400 Bad Request"],
        ["Pierdere conexiune DB în timpul cererii", "SQLAlchemy event listener recrează conexiunea pool; cererea curentă eșuează cu 500; frontend reîncearcă (exponential backoff)"],
        ["Eroare generare factură PDF", "Comanda este <b>creată</b> oricum (nu blochează cumpărarea); eroarea este logată; job offline regenerează factura; admin poate descărca ulterior"],
        ["Date firmă incomplete", "Factura este generată cu mențiune <i>Date fiscale în curs de completare</i>; admin notificat"],
        ["CORS origin neautorizat", "Middleware-ul FastAPI CORSMiddleware blochează cu 400"],
    ]
    s.append(_styled_table(cond, col_widths=[4.5 * cm, 12 * cm]))

    s.append(_P("Cazuri de utilizare administrative", "h3"))
    for b in [
        "<b>Backup DB</b>: comandă cron pe host — <i>docker exec db pg_dump ... &gt; backup.sql</i>, retention 30 zile;",
        "<b>Reset parolă admin</b>: UPDATE direct în baza de date (hash bcrypt generat offline) — procedură documentată;",
        "<b>Rotire secret JWT</b>: modificare <i>JWT_SECRET</i> în env, restart API — invalidează toate sesiunile active (comportament așteptat);",
        "<b>Reînnoire certificate TLS</b>: Let's Encrypt cu certbot, hook post-renewal pentru <i>nginx -s reload</i>;",
        "<b>Monitorizare</b>: loguri Docker exporți către agregator (Loki/ELK); metrici Prometheus expuse de API la <i>/metrics</i>.",
    ]:
        s.append(Paragraph(f"• {b}", styles["bullet"]))
    s.append(PageBreak())

    # ========= GLOSAR =========
    s.append(_P("Glosar de termeni", "h1"))
    glossary = [
        ["Termen", "Explicație"],
        ["ACID", "Atomicitate, Consistență, Izolare, Durabilitate — proprietățile tranzacțiilor DB"],
        ["ASGI", "Asynchronous Server Gateway Interface — standardul Python pentru server web asincron"],
        ["Backend", "Componenta server-side a aplicației, responsabilă de logica de business și persistență"],
        ["bcrypt", "Algoritm de hash pentru parole, rezistent la atacuri brute-force prin cost configurabil"],
        ["Container", "Unitate de rulare izolată Docker, partajează kernel-ul gazdei"],
        ["CSP", "Content Security Policy — header HTTP care restricționează sursele de conținut admis"],
        ["Endpoint", "URL expus de API care răspunde unei cereri HTTP specifice"],
        ["Frontend", "Componenta client-side, rulează în browser"],
        ["HSTS", "HTTP Strict Transport Security — forțează browser-ul să folosească HTTPS"],
        ["IDOR", "Insecure Direct Object Reference — vulnerabilitate OWASP A01"],
        ["Idempotență", "Proprietate: repetarea unei operații produce același efect ca aplicarea ei o singură dată"],
        ["Lock pesimist", "SELECT ... FOR UPDATE — blochează rândurile selectate până la COMMIT/ROLLBACK"],
        ["Middleware", "Strat de cod care interceptează cererile între recepție și procesare"],
        ["Pydantic", "Bibliotecă Python pentru validare date și serializare via anotări de tip"],
        ["Reverse proxy", "Server intermediar care primește cereri și le redirecționează către backend"],
        ["SaaS", "Software as a Service (ex: Stripe)"],
        ["Salt", "Șir aleator adăugat parolei înainte de hash, unic per utilizator"],
        ["Stateless", "Arhitectură în care serverul nu păstrează stare între cereri"],
        ["Webhook", "Callback HTTP trimis de un serviciu extern pentru a notifica un eveniment"],
    ]
    s.append(_styled_table(glossary, col_widths=[3.5 * cm, 13 * cm]))

    return s


def main():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.2 * cm,
        title="RXP Custom 3D - Proiectare Arhitecturala",
        author="Grupa 332CA",
    )
    doc.build(build_story(), onFirstPage=_header_footer, onLaterPages=_header_footer)
    print(f"[OK] Generat: {OUTPUT}")


if __name__ == "__main__":
    main()
