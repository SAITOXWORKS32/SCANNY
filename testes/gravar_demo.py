"""Grava o vídeo de demonstração e tira os prints de todas as telas do SCANNY.
Percorre o menu clicando, como um usuário faria. Saída: scanny-entrega/prints e scanny-entrega/video."""
import glob
import json
import os
import shutil
import subprocess
from playwright.sync_api import sync_playwright

BASE = "/tmp/claude-0/-home-claude/634c3789-b639-5f85-9b44-328767e50eef/scratchpad/scanny-ui/index.html"
ENTREGA = "/tmp/claude-0/-home-claude/634c3789-b639-5f85-9b44-328767e50eef/scratchpad/scanny-entrega"
PRINTS = f"{ENTREGA}/prints"
VIDEO_DIR = f"{ENTREGA}/video"
TMP_VIDEO = "/tmp/claude-0/-home-claude/634c3789-b639-5f85-9b44-328767e50eef/scratchpad/video-bruto"

# (categoria, subcategoria, nome do print)
ROTAS = [
    ("Visão geral", "Resumo", "01-resumo"),
    ("Visão geral", "Recomendações", "02-recomendacoes"),
    ("Visão geral", "Atividade", "03-atividade"),
    ("Otimização", "Análise", "04-analise"),
    ("Otimização", "Limpeza", "05-limpeza"),
    ("Otimização", "Desempenho", "06-desempenho"),
    ("Otimização", "Inicialização", "07-inicializacao"),
    ("Sistema", "Armazenamento", "08-armazenamento"),
    ("Sistema", "Jogos", "09-jogos"),
    ("Sistema", "Reparos", "10-reparos"),
    ("Proteção", "Privacidade", "11-privacidade"),
    ("Proteção", "Segurança e restauração", "12-seguranca"),
    ("Proteção", "Histórico", "13-historico"),
    ("Aplicativo", "Configurações", "14-configuracoes"),
    ("Aplicativo", "Sobre", "15-sobre"),
]

os.makedirs(PRINTS, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)
shutil.rmtree(TMP_VIDEO, ignore_errors=True)

# Estado inicial: dados de exemplo ligados, tema escuro (padrão). Só na primeira abertura.
INIT = """
if (!localStorage.getItem('scanny.v1')) {
  localStorage.setItem('scanny.v1', JSON.stringify({ settings: { sample: true, theme: 'escuro' } }));
}
"""


def ir(page, cat, sub):
    """Abre a categoria no menu e clica na subcategoria."""
    item = page.locator("button.sub-item", has_text=sub).first
    if not item.is_visible():           # só abre a categoria se estiver fechada (clicar de novo fecha)
        page.locator("button.cat", has_text=cat).first.click()
        page.wait_for_timeout(350)
    item.click()
    page.wait_for_timeout(900)


def print_tela(page, nome, cheia=True):
    page.wait_for_timeout(500)
    page.screenshot(path=f"{PRINTS}/{nome}.png", full_page=cheia)


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(
        viewport={"width": 1440, "height": 900},
        record_video_dir=TMP_VIDEO,
        record_video_size={"width": 1440, "height": 900},
    )
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    page.goto("file://" + BASE + "#/visao-geral")
    page.wait_for_timeout(1200)

    # 1. Percorre cada tela pelo menu (isso aparece no vídeo)
    for cat, sub, nome in ROTAS:
        ir(page, cat, sub)
        if nome == "05-limpeza":
            page.locator("button[data-action='analisar-clean']").first.click()
            page.wait_for_timeout(1400)
            page.locator("label.check:has(input[data-check='clean'])").nth(4).click()
            page.wait_for_timeout(500)
        if nome == "04-analise":
            page.locator("button[data-action='analisar-run']").first.click()
            page.wait_for_timeout(4600)
        print_tela(page, nome)

    # 2. Ações com confirmação (no vídeo)
    ir(page, "Otimização", "Limpeza")
    page.locator("button[data-action='limpeza-run']").click()
    page.wait_for_timeout(700)
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(4200)
    print_tela(page, "16-limpeza-concluida")

    ir(page, "Otimização", "Desempenho")
    page.locator("button[data-action='modo'][data-arg='desempenho']").click()
    page.wait_for_timeout(600)
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(1000)
    print_tela(page, "17-desempenho-modo-aplicado")

    ir(page, "Sistema", "Reparos")
    page.locator("button[data-action='repair-ask'][data-arg='dns']").click()
    page.wait_for_timeout(700)
    print_tela(page, "18-reparo-confirmacao", cheia=False)
    page.locator(".modal-foot button[data-val='ok']").click()
    page.wait_for_timeout(2600)
    print_tela(page, "19-reparo-concluido")

    # 3. Tema claro (só para mostrar a opção)
    ir(page, "Aplicativo", "Configurações")
    page.locator("button[data-set='settings.theme'][data-value='claro']").click()
    page.wait_for_timeout(900)
    print_tela(page, "20-configuracoes-tema-claro")
    ir(page, "Visão geral", "Resumo")
    print_tela(page, "21-resumo-tema-claro")
    ir(page, "Aplicativo", "Configurações")
    page.locator("button[data-set='settings.theme'][data-value='escuro']").click()
    page.wait_for_timeout(700)

    # Volta ao resumo para fechar o vídeo
    ir(page, "Visão geral", "Resumo")
    page.wait_for_timeout(1500)

    # 5. Celular
    mob = ctx.new_page()
    mob.set_viewport_size({"width": 390, "height": 844})
    mob.goto("file://" + BASE + "#/visao-geral")
    mob.wait_for_timeout(700)
    mob.screenshot(path=f"{PRINTS}/22-celular-resumo.png", full_page=True)
    mob.close()

    page.close()
    ctx.close()  # grava o vídeo
    br.close()

# Converte o vídeo bruto para MP4 (e mantém WebM)
bruto = glob.glob(f"{TMP_VIDEO}/*.webm")
if bruto:
    shutil.copy(bruto[0], f"{VIDEO_DIR}/scanny-demo.webm")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", bruto[0],
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-crf", "23", f"{VIDEO_DIR}/scanny-demo.mp4"], check=True)
    print("video:", f"{VIDEO_DIR}/scanny-demo.mp4")
else:
    print("ERRO: vídeo não foi gerado")
print("prints:", len(glob.glob(f"{PRINTS}/*.png")))
