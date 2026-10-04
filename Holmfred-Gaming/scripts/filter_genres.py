"""
Remove games from src/data/*.json when:
- the only genre is Compilation, or
- genres include Special edition
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "data"


def normalize(genre: str) -> str:
    return genre.strip().lower().replace(" ", "-")


def should_remove(game: dict) -> bool:
    genres = [
        normalize(genre)
        for genre in (game.get("genres") or [])
        if isinstance(genre, str) and genre.strip()
    ]
    if not genres:
        return False
    if all(genre == "compilation" for genre in genres):
        return True
    if any("special-edition" in genre for genre in genres):
        return True
    return False


def dump_compact(games: list, path: Path) -> None:
    lines = [json.dumps(game, ensure_ascii=False, separators=(",", ":")) for game in games]
    path.write_text("[\n  " + ",\n  ".join(lines) + "\n]\n", encoding="utf-8")


def main() -> None:
    for path in sorted(DATA_DIR.glob("*.json")):
        if path.name.endswith(".progress.json"):
            progress = json.loads(path.read_text(encoding="utf-8"))
            games = progress.get("games") or []
            kept = [game for game in games if not should_remove(game)]
            removed = len(games) - len(kept)
            progress["games"] = kept
            path.write_text(json.dumps(progress), encoding="utf-8")
            print(f"{path.name}: {len(games)} -> {len(kept)} (removed {removed})")
            continue

        games = json.loads(path.read_text(encoding="utf-8"))
        kept = [game for game in games if not should_remove(game)]
        removed = len(games) - len(kept)
        dump_compact(kept, path)
        print(f"{path.name}: {len(games)} -> {len(kept)} (removed {removed})")


if __name__ == "__main__":
    main()
