"""Create private local configuration without overwriting an existing file."""
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    for example, target in [
        ("backend/.env.example", "backend/.env"),
        ("frontend/.env.example", "frontend/.env.local"),
    ]:
        destination = ROOT / target
        if destination.exists():
            print(f"Preserved: {target}")
            continue
        content = (ROOT / example).read_text(encoding="utf-8")
        content = content.replace("replace_with_a_random_local_secret", secrets.token_urlsafe(48))
        destination.write_text(content, encoding="utf-8")
        print(f"Created: {target}")


if __name__ == "__main__":
    main()
