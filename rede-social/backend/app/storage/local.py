import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class LocalStorage:
    """Guarda arquivos no disco local (um volume Docker em produção local)."""

    def __init__(self, root: Path, base_url: str) -> None:
        self.root = root.resolve()
        self.base_url = base_url.rstrip("/")

    def save(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path_for(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def delete(self, key: str) -> None:
        try:
            self._path_for(key).unlink(missing_ok=True)
        except OSError:
            # Falha ao remover um arquivo órfão não deve derrubar a requisição.
            logger.warning("Não foi possível remover o arquivo %s", key, exc_info=True)

    def url_for(self, key: str) -> str:
        return f"{self.base_url}/{key}"

    def _path_for(self, key: str) -> Path:
        path = (self.root / key).resolve()
        # Defesa em profundidade: a chave nunca pode apontar para fora da pasta de mídia.
        if not path.is_relative_to(self.root):
            raise ValueError(f"Chave de arquivo inválida: {key}")
        return path
