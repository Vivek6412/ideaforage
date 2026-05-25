from sqlalchemy import Column, String, Text, Boolean, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base


class GithubPush(Base):
    __tablename__ = "github_pushes"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','success','failed')",
            name="chk_github_pushes_status"
        ),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    repo_url   = Column(Text)
    repo_name  = Column(String(255))
    branch     = Column(String(100), server_default="main")
    is_private = Column(Boolean, server_default=text("TRUE"))
    commit_sha = Column(Text)
    status     = Column(String(20), server_default="pending")
    error_log  = Column(Text)
    pushed_at  = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))