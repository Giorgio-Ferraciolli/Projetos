"""Popula o banco com dados de demonstração (usuários, comunidades, posts e curtidas).

Uso:  docker compose exec backend python -m app.seed

É idempotente: se os usuários de demonstração já existirem, nada é feito. As imagens
são geradas com o Pillow, então o projeto não depende de arquivos externos.
"""

import logging
import random
from datetime import date, timedelta
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import utc_now
from app.db.session import SessionLocal
from app.models import User
from app.observability.logging import setup_logging
from app.schemas.user import RegisterRequest
from app.services import community_service, post_service, user_service
from app.storage import Storage, get_storage

logger = logging.getLogger("app.seed")

DEMO_PASSWORD = "senha123"

DEMO_USERS = [
    (
        "Ana Souza",
        "ana",
        date(1995, 3, 12),
        "Fotógrafa amadora e apaixonada por café. ☕📷",
        "#7c3aed",
    ),
    (
        "Bruno Lima",
        "bruno",
        date(1990, 7, 25),
        "Dev backend, corredor de fim de semana.",
        "#0ea5e9",
    ),
    (
        "Carla Mendes",
        "carla",
        date(1998, 11, 3),
        "Leitora voraz. Sempre com um livro na bolsa.",
        "#f97316",
    ),
    (
        "Diego Rocha",
        "diego",
        date(1987, 1, 30),
        "Trilheiro, ciclista e cozinheiro nas horas vagas.",
        "#16a34a",
    ),
]

DEMO_COMMUNITIES = [
    (
        "Fotografia Urbana",
        "Cliques da cidade: arquitetura, ruas e pessoas.",
        "ana",
        ("#312e81", "#a78bfa"),
    ),
    ("Clube do Livro", "Indicações, resenhas e a leitura do mês.", "carla", ("#7c2d12", "#fdba74")),
    (
        "Trilhas e Natureza",
        "Roteiros de trilhas, dicas de equipamento e fotos.",
        "diego",
        ("#14532d", "#86efac"),
    ),
]

# (autor, legenda, comunidade ou None, cores da imagem ou None para post só de texto)
DEMO_POSTS = [
    ("ana", "Pôr do sol visto do terraço hoje. Que céu! 🌅", None, ("#f97316", "#7c3aed")),
    ("bruno", "Primeira meia maratona concluída! 21 km em 1h58. 🏃", None, ("#0ea5e9", "#1e3a8a")),
    (
        "carla",
        'Terminei "Torto Arado" e estou sem palavras. Alguém mais leu?',
        "Clube do Livro",
        None,
    ),
    (
        "diego",
        "Trilha da Pedra Bonita no domingo. Vista incrível lá de cima.",
        "Trilhas e Natureza",
        ("#16a34a", "#0f766e"),
    ),
    ("ana", "Brincando com reflexos depois da chuva.", "Fotografia Urbana", ("#1e293b", "#6366f1")),
    ("bruno", "Alguém recomenda um bom livro sobre arquitetura de software?", None, None),
    ("carla", "Cantinho de leitura novo. ✨", None, ("#fb923c", "#fde68a")),
    (
        "diego",
        "Testei uma receita de pão de fermentação natural. Ficou ótimo!",
        None,
        ("#a16207", "#fef3c7"),
    ),
]


def run() -> None:
    setup_logging(settings.log_level, settings.log_format)
    if settings.environment == "production":
        logger.warning("Dados de demonstração não são criados em produção.")
        return
    storage = get_storage()
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.username == DEMO_USERS[0][1])):
            logger.info("Dados de demonstração já existem; nada a fazer.")
            return
        users = _create_users(db, storage)
        communities = _create_communities(db, storage, users)
        _create_posts(db, storage, users, communities)
    logger.info("Dados de demonstração criados. Login: ana@example.com / %s", DEMO_PASSWORD)


def _create_users(db: Session, storage: Storage) -> dict[str, User]:
    users = {}
    for name, username, birth_date, bio, color in DEMO_USERS:
        data = RegisterRequest(
            name=name,
            username=username,
            email=f"{username}@example.com",
            password=DEMO_PASSWORD,
            birth_date=birth_date,
            bio=bio,
        )
        user = user_service.register_user(db, data)
        user_service.update_avatar(db, storage, user, _avatar_image(name[0], color))
        users[username] = user
    return users


def _create_communities(db: Session, storage: Storage, users: dict[str, User]) -> dict:
    communities = {}
    for name, description, owner, colors in DEMO_COMMUNITIES:
        community = community_service.create_community(
            db, storage, users[owner], name, description, _landscape_image(colors, seed=name)
        )
        communities[name] = community
    # Todos participam de todas as comunidades, exceto Bruno no Clube do Livro.
    for community in communities.values():
        for username, user in users.items():
            if not (username == "bruno" and community.name == "Clube do Livro"):
                community_service.join(db, community, user)
    return communities


def _create_posts(db: Session, storage: Storage, users: dict[str, User], communities: dict) -> None:
    rng = random.Random(42)
    total = len(DEMO_POSTS)
    for index, (author, caption, community_name, colors) in enumerate(DEMO_POSTS):
        community = communities.get(community_name)
        image = _landscape_image(colors, seed=caption) if colors else None
        post = post_service.create_post(
            db, storage, users[author], caption, community.id if community else None, image
        )
        # Espalha as datas nos últimos dias (os mais antigos são criados primeiro).
        post.created_at = utc_now() - timedelta(
            hours=(total - index) * 7, minutes=rng.randint(0, 59)
        )
        db.commit()
        for liker in rng.sample(list(users.values()), k=rng.randint(0, len(users))):
            post_service.like_post(db, post, liker)


def _avatar_image(letter: str, color: str) -> bytes:
    size = 256
    image = Image.new("RGB", (size, size), color)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=128)
    draw.text((size / 2, size / 2), letter.upper(), fill="white", font=font, anchor="mm")
    return _to_png(image)


def _landscape_image(colors: tuple[str, str], seed: str) -> bytes:
    """Desenha uma paisagem simples: céu em degradê, sol e montanhas."""
    rng = random.Random(seed)
    width, height = 1200, 800
    top, bottom = (Image.new("RGB", (1, 1), c).getpixel((0, 0)) for c in colors)
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / height
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3)),
        )
    sun_x, sun_y, radius = rng.randint(200, 1000), rng.randint(150, 350), rng.randint(60, 110)
    draw.ellipse([sun_x - radius, sun_y - radius, sun_x + radius, sun_y + radius], fill="#fef3c7")
    for layer, shade in enumerate((70, 40, 15)):
        base_y = 520 + layer * 90
        points = [(0, height)]
        for x in range(0, width + 150, 150):
            points.append((x, base_y - rng.randint(40, 200)))
        points.append((width, height))
        draw.polygon(points, fill=(shade, shade // 2, shade + 40))
    return _to_png(image)


def _to_png(image: Image.Image) -> bytes:
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


if __name__ == "__main__":
    run()
