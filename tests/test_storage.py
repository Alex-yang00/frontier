from core.storage import read_json, write_json


def test_atomic_json_roundtrip(tmp_path):
    path = tmp_path / "nested" / "data.json"
    write_json(path, {"items": [1, 2]})
    assert read_json(path) == {"items": [1, 2]}
