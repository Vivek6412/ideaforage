from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def generate_fernet_key() -> str:
    return Fernet.generate_key().decode()


def encrypt(value: str) -> str:
    f = Fernet(settings.FERNET_KEY.encode())
    return f.encrypt(value.encode()).decode()


def decrypt(encrypted: str) -> str:
    try:
        f = Fernet(settings.FERNET_KEY.encode())
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Decryption failed: invalid key or corrupted data") from e