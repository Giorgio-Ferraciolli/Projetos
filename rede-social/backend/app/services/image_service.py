"""Validação, normalização e gravação de imagens enviadas pelos usuários."""

import uuid
from dataclasses import dataclass
from enum import StrEnum
from io import BytesIO
from typing import BinaryIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.exceptions import InvalidInputError, PayloadTooLargeError
from app.storage import Storage


class ImageKind(StrEnum):
    """Tipo de imagem. O valor é a pasta onde ela será guardada no storage."""

    AVATAR = "avatars"
    POST = "posts"
    COVER = "covers"


# Maior lado permitido (em pixels) após o redimensionamento de cada tipo de imagem.
MAX_DIMENSION = {ImageKind.AVATAR: 512, ImageKind.POST: 1600, ImageKind.COVER: 1600}

# Limite de pixels verificado ANTES de decodificar. Um PNG de poucos KB pode declarar
# dimensões enormes e ocupar gigabytes de memória ao ser aberto ("decompression bomb").
# 50 MP cobre fotos de câmeras de celular modernas.
MAX_PIXELS = 50_000_000

# Formatos que o Pillow pode abrir, identificados pelo conteúdo real do arquivo
# (não pela extensão). Qualquer outro formato é recusado antes de ser decodificado.
ALLOWED_FORMATS = ["JPEG", "PNG", "WEBP"]

# Formato detectado -> (formato de saída, extensão, content type). MPO é o JPEG gerado
# por muitos celulares e câmeras (um JPEG com imagens extras); gravamos como JPEG comum.
SUPPORTED_FORMATS = {
    "JPEG": ("JPEG", "jpg", "image/jpeg"),
    "MPO": ("JPEG", "jpg", "image/jpeg"),
    "PNG": ("PNG", "png", "image/png"),
    "WEBP": ("WEBP", "webp", "image/webp"),
}


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    extension: str
    content_type: str


def read_upload(file: BinaryIO) -> bytes:
    """Lê o arquivo enviado respeitando o tamanho máximo configurado."""
    limit = settings.max_upload_size_bytes
    data = file.read(limit + 1)
    if len(data) > limit:
        raise PayloadTooLargeError(f"A imagem deve ter no máximo {settings.max_upload_size_mb} MB.")
    if not data:
        raise InvalidInputError("O arquivo de imagem está vazio.")
    return data


def process_image(data: bytes, kind: ImageKind) -> ProcessedImage:
    """Confere se é uma imagem de verdade, corrige a orientação, reduz o tamanho
    e regrava o arquivo. Regravar remove metadados como EXIF/GPS (privacidade)."""
    max_side = MAX_DIMENSION[kind]
    image = _open_image(data, max_side)
    output_format, extension, content_type = SUPPORTED_FORMATS[image.format or ""]
    # O perfil de cor (ICC) não tem dados pessoais e evita cores "lavadas" em fotos de celular.
    icc_profile = image.info.get("icc_profile")

    ImageOps.exif_transpose(image, in_place=True)  # aplica a rotação indicada pela câmera
    image.thumbnail((max_side, max_side))

    return ProcessedImage(_encode(image, output_format, icc_profile), extension, content_type)


def save_image(storage: Storage, data: bytes, kind: ImageKind) -> str:
    """Processa e grava a imagem. Retorna a chave do arquivo no storage."""
    processed = process_image(data, kind)
    key = f"{kind.value}/{uuid.uuid4().hex}.{processed.extension}"
    storage.save(key, processed.data, processed.content_type)
    return key


def _open_image(data: bytes, max_side: int) -> Image.Image:
    invalid = InvalidInputError(
        "O arquivo enviado não é uma imagem válida. Envie uma imagem JPEG, PNG ou WEBP."
    )
    try:
        # formats=... faz o Pillow recusar outros formatos antes de decodificá-los.
        with Image.open(BytesIO(data), formats=ALLOWED_FORMATS) as probe:
            width, height = probe.size  # lido do cabeçalho, sem decodificar os pixels
            if width * height > MAX_PIXELS:
                raise InvalidInputError("A imagem tem dimensões grandes demais.")
            probe.verify()
        image = Image.open(BytesIO(data), formats=ALLOWED_FORMATS)
        # JPEGs podem ser decodificados direto em escala reduzida, economizando memória.
        image.draft("RGB", (max_side, max_side))
        image.load()
    except InvalidInputError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise invalid from exc
    return image


def _encode(image: Image.Image, image_format: str, icc_profile: bytes | None) -> bytes:
    output = BytesIO()
    if image_format == "JPEG":
        image.convert("RGB").save(
            output, format="JPEG", quality=85, optimize=True, icc_profile=icc_profile
        )
    elif image_format == "WEBP":
        image.save(output, format="WEBP", quality=85, icc_profile=icc_profile)
    else:
        image.save(output, format="PNG", optimize=True)
    return output.getvalue()
