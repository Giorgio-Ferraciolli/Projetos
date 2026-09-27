"""initial schema: users, communities, community_members, posts, post_likes

Revision ID: 64b7fc636fd7
Revises:
Create Date: 2026-09-27 18:31:20.721022

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "64b7fc636fd7"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("bio", sa.String(length=500), nullable=True),
        sa.Column("avatar_key", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )
    op.create_table(
        "communities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=False),
        sa.Column("cover_key", sa.String(length=255), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_communities_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_communities")),
        sa.UniqueConstraint("name", name=op.f("uq_communities_name")),
    )
    op.create_index(op.f("ix_communities_owner_id"), "communities", ["owner_id"], unique=False)
    op.create_table(
        "community_members",
        sa.Column("community_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["community_id"],
            ["communities.id"],
            name=op.f("fk_community_members_community_id_communities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_community_members_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("community_id", "user_id", name=op.f("pk_community_members")),
    )
    op.create_index(
        op.f("ix_community_members_user_id"), "community_members", ["user_id"], unique=False
    )
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("community_id", sa.Integer(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("image_key", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "caption IS NOT NULL OR image_key IS NOT NULL", name=op.f("ck_posts_has_content")
        ),
        sa.ForeignKeyConstraint(
            ["author_id"], ["users.id"], name=op.f("fk_posts_author_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["community_id"],
            ["communities.id"],
            name=op.f("fk_posts_community_id_communities"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_posts")),
    )
    op.create_index("ix_posts_author_id_id", "posts", ["author_id", "id"], unique=False)
    op.create_index("ix_posts_community_id_id", "posts", ["community_id", "id"], unique=False)
    op.create_table(
        "post_likes",
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"], ["posts.id"], name=op.f("fk_post_likes_post_id_posts"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_post_likes_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("post_id", "user_id", name=op.f("pk_post_likes")),
    )
    op.create_index(op.f("ix_post_likes_user_id"), "post_likes", ["user_id"], unique=False)


def downgrade() -> None:
    # Remover as tabelas também remove seus índices. Os índices não são removidos
    # antes porque o MySQL não permite apagar um índice usado por uma foreign key.
    op.drop_table("post_likes")
    op.drop_table("posts")
    op.drop_table("community_members")
    op.drop_table("communities")
    op.drop_table("users")
