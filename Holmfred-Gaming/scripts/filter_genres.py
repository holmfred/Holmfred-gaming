import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "data"
TARGETS = ("compilation", "special-edition")


def normalize(value: str) -> str:
    return value.lower().replace(" ", "-")


def should_remove(game: dict) -> bool:
    genres = game.get("genres") or []
    return any(any(target in normalize(genre) for target in TARGETS) for genre in genres)


def dump_compact(games: list, path: Path) -> None:
    lines = [json.dumps(game, ensure_ascii=False, separators=(",", ":")) for game in games]
    path.write_text("[\n  " + ",\n  ".join(lines) + "\n]\n", encoding="utf-8")


def main() -> None:
    for path in sorted(DATA_DIR.glob("*.json")):
        games = json.loads(path.read_text(encoding="utf-8"))
        kept = [game for game in games if not should_remove(game)]
        removed = len(games) - len(kept)
        dump_compact(kept, path)
        print(f"{path.name}: {len(games)} -> {len(kept)} (removed {removed})")


if __name__ == "__main__":
    main()
