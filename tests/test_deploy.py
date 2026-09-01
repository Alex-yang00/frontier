from pathlib import Path

from scripts.install_systemd import render_units


def test_systemd_installer_renders_checkout_and_instance_service(tmp_path):
    checkout = Path("/srv/frontier checkout")
    written = render_units(tmp_path, checkout)

    names = {path.name for path in written}
    assert "frontier-collect@.service" in names
    assert "frontier-edition.service" in names
    collect = (tmp_path / "frontier-collect@.service").read_text(encoding="utf-8")
    assert "WorkingDirectory=/srv/frontier checkout" in collect
    assert "--group %i" in collect
    edition = (tmp_path / "frontier-edition.service").read_text(encoding="utf-8")
    assert "--process-only" in edition
    assert "--no-publish" not in edition


def test_timers_keep_staggered_collection_and_two_editions():
    root = Path("deploy/systemd")
    fast = (root / "frontier-collect-fast.timer").read_text(encoding="utf-8")
    medium = (root / "frontier-collect-medium.timer").read_text(encoding="utf-8")
    slow = (root / "frontier-collect-slow.timer").read_text(encoding="utf-8")
    edition = (root / "frontier-edition.timer").read_text(encoding="utf-8")

    assert "23:20:00" in fast and "11:20:00" in fast
    assert "23:00:00" in medium and "11:00:00" in medium
    assert "23:10:00" in slow and "11:10:00" in slow
    assert "00:00:00" in edition and "12:00:00" in edition
