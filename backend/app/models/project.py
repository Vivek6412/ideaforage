from sqlalchemy import Column, String, Text, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "current_state IN ("
            "'IDEA_CAPTURE','IDEA_CONFIRMED',"
            "'BLUEPRINT_DRAFT','BLUEPRINT_CONFIRMED',"
            "'PROMPTS_GENERATED','PROMPTS_CONFIRMED',"
            "'EXECUTION_RUNNING','EXECUTION_COMPLETE',"
            "'GITHUB_PUSHED','DEPLOYED','PAUSED'"
            ")",
            name="chk_projects_current_state"
        ),
    )

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(255), nullable=False)
    raw_idea      = Column(Text)
    current_state = Column(String(50), nullable=False, server_default="IDEA_CAPTURE")
    paused_reason = Column(Text)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))