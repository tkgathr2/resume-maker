"""Add zairyu_cards, zairyu_access_logs, users.role

Revision ID: 4a533381eda8
Revises: 474890acc565
Create Date: 2026-07-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a533381eda8'
down_revision: Union[str, None] = '474890acc565'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('role', sa.String(length=20), server_default='job_seeker', nullable=False),
    )

    op.create_table(
        'zairyu_cards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('card_number_encrypted', sa.Text(), nullable=False),
        sa.Column('card_number_hash', sa.String(length=64), nullable=False),
        sa.Column('cardholder_name_kana_encrypted', sa.Text(), nullable=False),
        sa.Column('validity_date', sa.DateTime(), nullable=False),
        sa.Column('status_of_residence_jp', sa.String(length=100), nullable=False),
        sa.Column('status_of_residence_code', sa.String(length=10), nullable=False),
        sa.Column('activity_restriction_jp', sa.String(length=100), nullable=False),
        sa.Column('activity_restriction_code', sa.String(length=10), nullable=False),
        sa.Column('consent_given', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('consent_given_at', sa.DateTime(), nullable=True),
        sa.Column('consent_document_url', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('verified_by', sa.Integer(), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('verification_notes', sa.Text(), nullable=True),
        sa.Column('can_work_in_japan', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('work_restriction_details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_zairyu_cards_card_number_hash'), 'zairyu_cards', ['card_number_hash'], unique=False)
    op.create_index(op.f('ix_zairyu_cards_is_verified'), 'zairyu_cards', ['is_verified'], unique=False)
    op.create_index(op.f('ix_zairyu_cards_can_work_in_japan'), 'zairyu_cards', ['can_work_in_japan'], unique=False)
    op.create_index(op.f('ix_zairyu_cards_created_at'), 'zairyu_cards', ['created_at'], unique=False)
    op.create_index(op.f('ix_zairyu_cards_deleted_at'), 'zairyu_cards', ['deleted_at'], unique=False)
    # Partial unique index: one *active* (non-soft-deleted) card per job
    # seeker. A plain unique constraint on user_id would permanently block
    # re-registration after a soft delete, since the deleted row still
    # "occupies" the unique slot.
    op.create_index(
        'ix_zairyu_cards_user_id_active',
        'zairyu_cards',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text('deleted_at IS NULL'),
        sqlite_where=sa.text('deleted_at IS NULL'),
    )

    op.create_table(
        'zairyu_access_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('zairyu_card_id', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['zairyu_card_id'], ['zairyu_cards.id'], ),
        sa.ForeignKeyConstraint(['staff_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_zairyu_access_logs_zairyu_card_id'), 'zairyu_access_logs', ['zairyu_card_id'], unique=False)
    op.create_index(op.f('ix_zairyu_access_logs_staff_id'), 'zairyu_access_logs', ['staff_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_zairyu_access_logs_staff_id'), table_name='zairyu_access_logs')
    op.drop_index(op.f('ix_zairyu_access_logs_zairyu_card_id'), table_name='zairyu_access_logs')
    op.drop_table('zairyu_access_logs')

    op.drop_index('ix_zairyu_cards_user_id_active', table_name='zairyu_cards')
    op.drop_index(op.f('ix_zairyu_cards_deleted_at'), table_name='zairyu_cards')
    op.drop_index(op.f('ix_zairyu_cards_created_at'), table_name='zairyu_cards')
    op.drop_index(op.f('ix_zairyu_cards_can_work_in_japan'), table_name='zairyu_cards')
    op.drop_index(op.f('ix_zairyu_cards_is_verified'), table_name='zairyu_cards')
    op.drop_index(op.f('ix_zairyu_cards_card_number_hash'), table_name='zairyu_cards')
    op.drop_table('zairyu_cards')

    op.drop_column('users', 'role')
