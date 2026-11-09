"""Testes do protótipo SCANNY.

Uso a partir da raiz do pacote:
    python3 testes/teste_scanny.py

Os testes aceitam CHROMIUM_PATH para indicar um executável alternativo.
"""
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "scanny-ui" / "index.html"
PRINTS = ROOT / "prints-test"
PAGES = ["visao-geral", "analisar", "limpeza", "desempenho", "inicializacao", "armazenamento",
         "jogos", "reparos", "privacidade", "seguranca", "historico", "configuracoes", "sobre"]

falhas = []


def check(cond, msg):
    print(("OK   " if cond else "FALHA ") + msg)
    if not cond:
        falhas.append(msg)


PRINTS.mkdir(exist_ok=True)

with sync_playwright() as p:
    launch_kwargs = {}
    chromium_path = os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium")
    if Path(chromium_path).exists():
        launch_kwargs["executable_path"] = chromium_path
    br = p.chromium.launch(**launch_kwargs)
    ctx = br.new_context(viewport={"width": 1366, "height": 860}, device_scale_factor=1)
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    page = ctx.new_page()
    erros = []
    page.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erros.append(str(e)))

    url = BASE.as_uri()
    page.goto(url + "#/visao-geral")
    page.evaluate("localStorage.clear()")
    page.goto(url + "#/visao-geral")
    page.reload()

    for pid in PAGES:
        page.evaluate(f"location.hash = '#/{pid}'")
        page.wait_for_timeout(120)
        txt = page.inner_text("#view")
        check(len(txt) > 20, f"tela '{pid}' renderiza com conteúdo")
    erros = [e for e in erros if "ERR_FAILED" not in e]
    check(not erros, f"sem erros de console ({len(erros)} erro(s): {erros[:3]})")

    page.evaluate("location.hash = '#/visao-geral'")
    page.wait_for_timeout(100)
    check("Não disponível" in page.inner_text("#view"), "sem dados de exemplo: mostra 'Não disponível'")

    page.evaluate("location.hash = '#/configuracoes'")
    page.wait_for_timeout(100)
    page.locator("button[data-toggle='settings.sample']").click()
    page.wait_for_timeout(150)
    check(page.locator("button[data-toggle='settings.sample']").get_attribute("aria-pressed") == "true",
          "dados de exemplo ligados")
    page.evaluate("location.hash = '#/visao-geral'")
    page.wait_for_timeout(150)
    check("GB" in page.inner_text("#view"), "com dados de exemplo: valores em GB aparecem")

    page.evaluate("location.hash = '#/analisar'")
    page.wait_for_timeout(100)
    page.locator("button[data-action='analisar-run']").first.click()
    page.wait_for_timeout(4800)
    check("Resultado" in page.text_content("#view"), "análise termina e mostra o resultado")

    page.evaluate("location.hash = '#/limpeza'")
    page.wait_for_timeout(100)
    check(page.locator("button[data-action='limpeza-run']").is_disabled(), "limpar desabilitado antes de analisar")
    page.locator("button[data-action='analisar-clean']").first.click()
    page.wait_for_timeout(1200)
    check(page.locator("input[data-check='clean']").count() >= 6, "limpeza: itens aparecem após análise")
    page.locator("button[data-action='limpeza-run']").click()
    page.wait_for_timeout(200)
    check(page.locator(".backdrop .modal").count() == 1, "limpeza pede confirmação (modal)")
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(3800)
    check("liberados" in page.inner_text("#view"), "limpeza executa e mostra resultado")

    page.evaluate("location.hash = '#/desempenho'")
    page.wait_for_timeout(100)
    page.locator("button[data-action='modo'][data-arg='maximo']").click()
    page.wait_for_timeout(150)
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(150)
    page.evaluate("location.hash = '#/historico'")
    page.wait_for_timeout(120)
    check("Aplicar efeitos visuais" in page.inner_text("#view"), "efeitos aplicados aparecem no histórico")
    page.locator("button[data-action='undo']").first.click()
    page.wait_for_timeout(120)
    check("Desfazer" in page.inner_text("#view"), "desfazer registra a ação")

    page.evaluate("location.hash = '#/inicializacao'")
    page.wait_for_timeout(120)
    check(page.locator("button[data-action='startup-toggle'][data-arg='audio']").count() == 0,
          "componente essencial não tem botão de desativar")
    page.locator("button[data-action='startup-toggle'][data-arg='discord']").click()
    page.wait_for_timeout(120)
    check(page.locator("button[data-action='startup-toggle'][data-arg='discord']").get_attribute("aria-pressed") == "false",
          "desativar programa muda o interruptor para desligado")

    page.evaluate("location.hash = '#/reparos'")
    page.wait_for_timeout(120)
    page.locator("button[data-action='repair-ask'][data-arg='dns']").click()
    page.wait_for_timeout(120)
    check("ipconfig /flushdns" in page.inner_text(".modal"), "reparo mostra o comando exato antes de executar")
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(1000)
    page.locator("button[data-action='repair-cancel']").click()
    page.wait_for_timeout(1000)
    check("Cancelado" in page.inner_text("#view"), "reparo pode ser cancelado")

    page.evaluate("location.hash = '#/privacidade'")
    page.wait_for_timeout(120)
    texto = page.inner_text("#view").lower()
    check("nome de perfil" not in texto and "foto" not in texto, "privacidade sem itens de perfil")

    mob = ctx.new_page()
    mob.set_viewport_size({"width": 390, "height": 844})
    mob.goto(url + "#/visao-geral")
    mob.wait_for_timeout(300)
    largura = mob.evaluate("document.documentElement.scrollWidth")
    check(largura <= 390, f"mobile sem rolagem horizontal (scrollWidth={largura})")

    dark = ctx.new_page()
    dark.set_viewport_size({"width": 1366, "height": 860})
    dark.emulate_media(color_scheme="dark")
    dark.goto(url + "#/desempenho")
    dark.wait_for_timeout(300)

    css = (ROOT / "scanny-ui" / "css" / "style.css").read_text(encoding="utf-8")
    colored = []
    for h in set(re.findall(r"#([0-9a-fA-F]{6})\b", css)):
        r, g, b = h[0:2], h[2:4], h[4:6]
        if not (r == g == b):
            colored.append("#" + h)
    check(not colored, f"paleta só em cinzas (cores coloridas: {colored})")

    js_dir = ROOT / "scanny-ui" / "js"
    usados = set()
    for f in js_dir.iterdir():
        if f.name == "icons.js":
            continue
        usados |= set(re.findall(r"icon\(\s*'([\w-]+)'", f.read_text(encoding="utf-8")))
    usados |= set(re.findall(r'data-icon="([\w-]+)"', (ROOT / "scanny-ui" / "index.html").read_text(encoding="utf-8")))
    disponiveis = set(page.evaluate("Object.keys(ICON_PATHS)"))
    faltando = sorted(usados - disponiveis)
    check(not faltando, f"ícones usados existem no pack ({len(usados)} usados, faltando: {faltando})")
    check(page.evaluate("document.querySelector('.brand img').naturalWidth") > 0, "app icon carrega")

    erros = [e for e in erros if "ERR_FAILED" not in e]
    check(not erros, f"sem erros de console no fim ({len(erros)}: {erros[:3]})")
    br.close()

print()
print("FALHAS:" if falhas else "Todos os testes passaram.", *(falhas or []), sep="\n  ")
sys.exit(1 if falhas else 0)
