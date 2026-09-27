from typing import Protocol


class Storage(Protocol):
    """Contrato mínimo de armazenamento de arquivos.

    O restante da aplicação conhece apenas esta interface e trabalha com "chaves"
    (ex.: "posts/3f2a.webp"). Para migrar para S3/MinIO, basta criar outra classe
    que implemente estes três métodos e trocá-la em `get_storage()`.
    """

    def save(self, key: str, data: bytes, content_type: str) -> None: ...

    def delete(self, key: str) -> None: ...

    def url_for(self, key: str) -> str: ...
