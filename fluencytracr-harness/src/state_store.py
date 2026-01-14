"""
State persistence for FluencyTracr Harness
File-based storage following Anthropic's long-running agent pattern

Key principles:
- Atomic writes: Use temp file + rename for crash safety
- Complete state: Every write captures full batch state
- Easy recovery: JSON format for debugging/manual intervention
"""

import json
import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from filelock import FileLock

from .models import AnalysisBatch, BatchStatus


class StateStore:
    """
    File-based state store for analysis batches

    Storage layout:
        data/batches/
        ├── {batch_id}.json          # Current state
        ├── {batch_id}.json.lock     # File lock
        └── archive/
            └── {batch_id}_{timestamp}.json  # Archived completed batches
    """

    def __init__(self, base_path: str = "data/batches"):
        self.base_path = Path(base_path)
        self.archive_path = self.base_path / "archive"
        self._ensure_directories()

    def _ensure_directories(self):
        """Create storage directories if they don't exist"""
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.archive_path.mkdir(parents=True, exist_ok=True)

    def _batch_path(self, batch_id: str) -> Path:
        """Get path for batch state file"""
        return self.base_path / f"{batch_id}.json"

    def _lock_path(self, batch_id: str) -> Path:
        """Get path for batch lock file"""
        return self.base_path / f"{batch_id}.json.lock"

    def save(self, batch: AnalysisBatch) -> None:
        """
        Atomically save batch state

        Uses write-to-temp-then-rename pattern for crash safety.
        If process crashes mid-write, old state remains intact.
        """
        batch.updated_at = datetime.now(timezone.utc)
        batch_path = self._batch_path(batch.batch_id)
        lock_path = self._lock_path(batch.batch_id)

        with FileLock(lock_path):
            # Write to temp file first
            fd, temp_path = tempfile.mkstemp(
                suffix=".json",
                prefix=f"{batch.batch_id}_",
                dir=self.base_path
            )
            try:
                with os.fdopen(fd, 'w') as f:
                    json.dump(batch.to_dict(), f, indent=2)

                # Atomic rename
                shutil.move(temp_path, batch_path)
            except Exception:
                # Clean up temp file on failure
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise

    def load(self, batch_id: str) -> Optional[AnalysisBatch]:
        """
        Load batch state from disk

        Returns None if batch doesn't exist.
        """
        batch_path = self._batch_path(batch_id)

        if not batch_path.exists():
            return None

        lock_path = self._lock_path(batch_id)

        with FileLock(lock_path):
            with open(batch_path, 'r') as f:
                data = json.load(f)
            return AnalysisBatch.from_dict(data)

    def exists(self, batch_id: str) -> bool:
        """Check if batch exists"""
        return self._batch_path(batch_id).exists()

    def delete(self, batch_id: str) -> bool:
        """
        Delete batch state

        Returns True if deleted, False if didn't exist.
        """
        batch_path = self._batch_path(batch_id)
        lock_path = self._lock_path(batch_id)

        if not batch_path.exists():
            return False

        with FileLock(lock_path):
            batch_path.unlink()

        # Clean up lock file
        if lock_path.exists():
            lock_path.unlink()

        return True

    def archive(self, batch_id: str) -> Optional[Path]:
        """
        Move completed batch to archive

        Preserves state for auditing while clearing active directory.
        Returns archive path or None if batch didn't exist.
        """
        batch_path = self._batch_path(batch_id)

        if not batch_path.exists():
            return None

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        archive_name = f"{batch_id}_{timestamp}.json"
        archive_dest = self.archive_path / archive_name

        lock_path = self._lock_path(batch_id)

        with FileLock(lock_path):
            shutil.copy2(batch_path, archive_dest)
            batch_path.unlink()

        # Clean up lock file
        if lock_path.exists():
            lock_path.unlink()

        return archive_dest

    def list_active(self) -> List[str]:
        """List all active (non-archived) batch IDs"""
        return [
            p.stem for p in self.base_path.glob("*.json")
            if not p.name.endswith(".lock")
        ]

    def list_by_status(self, status: BatchStatus) -> List[AnalysisBatch]:
        """Load all batches with given status"""
        batches = []
        for batch_id in self.list_active():
            batch = self.load(batch_id)
            if batch and batch.status == status:
                batches.append(batch)
        return batches

    def list_by_org(self, org_id: str) -> List[AnalysisBatch]:
        """Load all batches for an organization"""
        batches = []
        for batch_id in self.list_active():
            batch = self.load(batch_id)
            if batch and batch.org_id == org_id:
                batches.append(batch)
        return batches

    def get_pending_batches(self) -> List[AnalysisBatch]:
        """Get batches ready to be processed"""
        return self.list_by_status(BatchStatus.QUEUED)

    def get_in_progress_batches(self) -> List[AnalysisBatch]:
        """Get batches currently being processed"""
        return self.list_by_status(BatchStatus.IN_PROGRESS)

    def get_awaiting_approval(self) -> List[AnalysisBatch]:
        """Get batches waiting for human approval"""
        return self.list_by_status(BatchStatus.AWAITING_APPROVAL)

    def cleanup_stale_locks(self, max_age_seconds: int = 3600) -> int:
        """
        Remove stale lock files

        Locks older than max_age_seconds are considered orphaned
        (e.g., from crashed processes) and are removed.

        Returns count of removed locks.
        """
        removed = 0
        now = datetime.now(timezone.utc).timestamp()

        for lock_path in self.base_path.glob("*.json.lock"):
            # Check if corresponding batch file exists
            batch_path = self.base_path / lock_path.name.replace(".lock", "")

            if not batch_path.exists():
                # Orphaned lock file
                lock_path.unlink()
                removed += 1
                continue

            # Check lock age
            lock_age = now - lock_path.stat().st_mtime
            if lock_age > max_age_seconds:
                lock_path.unlink()
                removed += 1

        return removed

    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        active_batches = self.list_active()

        status_counts = {status.value: 0 for status in BatchStatus}
        total_cost = 0.0

        for batch_id in active_batches:
            batch = self.load(batch_id)
            if batch:
                status_counts[batch.status.value] += 1
                total_cost += batch.total_cost_usd

        archived_count = len(list(self.archive_path.glob("*.json")))

        return {
            "active_batches": len(active_batches),
            "archived_batches": archived_count,
            "status_breakdown": status_counts,
            "total_cost_usd": total_cost
        }
