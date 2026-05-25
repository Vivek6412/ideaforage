from sqlalchemy import Column, String, Text, CheckConstraint, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base


class Deployment(Base):
    __tablename__ = "deployments"
    __table_args__ = (
        CheckConstraint(
            "platform IN ('vercel','railway')",
            name="chk_deployments_platform"
        ),
        CheckConstraint(
            "service_type IN ('frontend','backend')",
            name="chk_deployments_service_type"
        ),
        CheckConstraint(
            "build_status IN ('pending','building','success','failed')",
            name="chk_deployments_build_status"
        ),
    )

    id                  = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id          = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    platform            = Column(String(20), nullable=False)
    service_type        = Column(String(20), nullable=False)
    deploy_url          = Column(Text)
    platform_project_id = Column(Text)
    build_status        = Column(String(20), server_default="pending")
    error_log           = Column(Text)
    deployed_at         = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at          = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))