"""Verify review archive bytes and manifest entries without extracting them."""

import hashlib
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify_entries(archive, manifest_name, file_hashes):
    names = archive.namelist()
    assert len(names) == len({name.casefold() for name in names})
    assert set(names) == {manifest_name, *file_hashes}
    for name, expected in file_hashes.items():
        path = PurePosixPath(name)
        assert not path.is_absolute() and ".." not in path.parts
        assert "\\" not in name and ":" not in name
        assert sha256(archive.read(name)) == expected, name


def main():
    evidence = Path("docs/phase-4.1/evidence")
    root = Path("tmp/phase-4/artifacts/p41-final-review")
    reviewed = []
    for item in json.loads((root / "artifacts.json").read_text(encoding="utf-8")):
        path = root / item["archive"]
        assert sha256(path.read_bytes()) == item["sha256"]
        with ZipFile(path) as archive:
            manifest_name = "deployment-manifest.json" if item["kind"] == "website" else "RELEASE.json"
            manifest = json.loads(archive.read(manifest_name))
            assert manifest["sourceCommit"] == item["sourceCommit"]
            assert not manifest["operationalReady"] and not manifest["liveDeploymentAuthorized"]
            verify_entries(archive, manifest_name, manifest["files"])
        reviewed.append({**item, "allArchiveEntriesVerified": True})

    path = Path("tmp/phase-4.1/security/upms-symfony-security-review.zip")
    receipt = json.loads((evidence / "security-patch.json").read_text(encoding="utf-8"))
    assert sha256(path.read_bytes()) == receipt["archiveSha256"]
    with ZipFile(path) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        assert manifest["changes"] == receipt["changes"]
        assert not manifest["publicationAuthorized"]
        hashes = {"files/" + entry["path"]: entry["after"] for entry in manifest["changes"] if entry["after"]}
        verify_entries(archive, "manifest.json", hashes)
    (evidence / "review-archive-verification.json").write_text(
        json.dumps(reviewed, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
