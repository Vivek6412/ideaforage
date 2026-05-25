from sqlalchemy import Column, String, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import text
from app.database import Base


class ExecutionLog(Base):
    __tablename__ = "execution_logs"
    __table_args__ = (
        CheckConstraint(
            "event IN ("
            "'task_started','api_call','parse_error',"
            "'validation_error','retry','fallback',"
            "'claude_code_output','fix_injected',"
            "'drift_detected','user_fix_requested',"
            "'task_approved','task_failed','task_paused'"
            ")",
            name="chk_execution_logs_event"
        ),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_id    = Column(UUID(as_uuid=True), ForeignKey("execution_tasks.id"))
    event      = Column(String(50), nullable=False)
    detail     = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))