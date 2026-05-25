from sqlalchemy import Column, String, Text, Integer, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.sql import text
from app.database import Base


class ExecutionTask(Base):
    __tablename__ = "execution_tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','running','pending_review','approved','failed','skipped')",
            name="chk_execution_tasks_status"
        ),
        CheckConstraint(
            "tool_used IN ('anthropic','openai','gemini','claude_code')",
            name="chk_execution_tasks_tool_used"
        ),
    )

    id              = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id      = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_name       = Column(String(100), nullable=False)
    task_order      = Column(Integer, nullable=False)
    depends_on      = Column(ARRAY(UUID(as_uuid=True)))
    prompt_used     = Column(Text)
    generated_files = Column(JSONB)
    status          = Column(String(30), server_default="pending")
    retry_count     = Column(Integer, server_default=text("0"))
    error_log       = Column(Text)
    tool_used       = Column(String(30))
    created_at      = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at      = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))