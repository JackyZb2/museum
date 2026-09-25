from alembic import op
import sqlalchemy as sa
revision = "0001_initial"; down_revision = None
def upgrade():
    op.create_table("museums", sa.Column("id", sa.Integer, primary_key=True), sa.Column("name", sa.String(255), nullable=False), sa.Column("description", sa.Text), sa.Column("created_at", sa.DateTime, server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()))
    op.create_table("artifacts", sa.Column("id", sa.Integer, primary_key=True), sa.Column("museum_id", sa.Integer, sa.ForeignKey("museums.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(255), nullable=False), sa.Column("dynasty", sa.String(100)), sa.Column("category", sa.String(100)), sa.Column("material", sa.String(100)), sa.Column("inventory_number", sa.String(100)), sa.Column("description", sa.Text), sa.Column("created_at", sa.DateTime, server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()))
    for name, type_name in (("assets", "image"), ("documents", "other")):
        op.create_table(name, sa.Column("id", sa.Integer, primary_key=True), sa.Column("artifact_id", sa.Integer, sa.ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False), sa.Column("filename", sa.String(255), nullable=False), sa.Column("original_filename", sa.String(255), nullable=False), sa.Column("file_path", sa.String(500), nullable=False), sa.Column("mime_type", sa.String(100), nullable=False), sa.Column("file_size", sa.Integer, nullable=False), sa.Column("asset_type" if name == "assets" else "document_type", sa.String(30), server_default=type_name), sa.Column("created_at", sa.DateTime, server_default=sa.func.now()))
def downgrade():
    op.drop_table("documents"); op.drop_table("assets"); op.drop_table("artifacts"); op.drop_table("museums")

