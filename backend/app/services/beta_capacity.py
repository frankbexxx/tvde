from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.models.enums import UserStatus


def active_beta_user_count(db: Session) -> int:
    """Pending signup requests do not consume approved beta capacity."""
    return (
        db.execute(
            select(func.count())
            .select_from(User)
            .where(User.status == UserStatus.active)
        ).scalar()
        or 0
    )
