import os
import sys
import webview


def resource_path(relative_path: str) -> str:
    """Resolve o caminho dos arquivos embutidos pelo PyInstaller."""
    base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)


if __name__ == "__main__":
    html_file = resource_path("index.html")
    window = webview.create_window(
        title="Gerador de Senhas por MAC",
        url=html_file,
        width=560,
        height=620,
        resizable=True,
        background_color="#020617",
    )
    # private_mode=False garante que o localStorage persista entre fechamentos do .exe
    webview.start(private_mode=False)