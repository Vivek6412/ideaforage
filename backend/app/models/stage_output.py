from sqlalchemy import Column, String, Text, Integer, UniqueConstraint, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import text
from app.database import Base


class StageOutput(Base):
    __tablename__ = "stage_outputs"
    __table_args__ = (
        UniqueConstraint("project_id", "stage", "round_number", name="uq_stage_outputs_project_stage_round"),
        CheckConstraint(
            "stage IN ('idea_capture','blueprint','prompts','execution','github','deploy')",
            name="chk_stage_outputs_stage"
        ),
        CheckConstraint(
            "status IN ('pending_review','approved','revision_requested')",
            name="chk_stage_outputs_status"
        ),
    )

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id    = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage         = Column(String(50), nullable=False)
    output_json   = Column(JSONB, nullable=False)
    status        = Column(String(30), server_default="pending_review")
    user_feedback = Column(Text)
    round_number  = Column(Integer, server_default=text("1"))
    created_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))