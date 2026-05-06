"""
State store for persistent batch storage
Following Anthropic's pattern: Save after every step
"""

import json
from pathlib import Path
from typing import Optional

from .models import AnalysisBatch


class StateStore:
    """
    Persistent storage for batch state

    Key pattern from Anthropic:
    - Save after every step
    - Enable resumability
    - Provide audit trail
    """

    def __init__(self, base_path: str = "./data/batches"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save_batch(self, batch: AnalysisBatch):
        """
        Save batch state to disk

        Creates/updates JSON file with complete batch state
        """
        batch_file = self.base_path / f"{batch.batch_id}.json"

        # Serialize batch
        batch_data = batch.to_dict()

        # Write atomically (write to temp, then rename)
        temp_file = batch_file.with_suffix('.json.tmp')
        with open(temp_file, 'w') as f:
            json.dump(batch_data, f, indent=2)

        # Atomic rename
        temp_file.rename(batch_file)

        print(f"✓ Saved batch {batch.batch_id} (status: {batch.status.value})")

    def load_batch(self, batch_id: str) -> Optional[AnalysisBatch]:
        """
        Load batch state from disk

        Returns None if batch not found
        """
        batch_file = self.base_path / f"{batch_id}.json"

        if not batch_file.exists():
            return None

        with open(batch_file, 'r') as f:
            batch_data = json.load(f)

        batch = AnalysisBatch.from_dict(batch_data)

        print(f"✓ Loaded batch {batch_id} (status: {batch.status.value}, step: {batch.current_step_index + 1}/{len(batch.steps)})")

        return batch

    def list_batches(
        self,
        org_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> list[str]:
        """
        List all batch IDs, optionally filtered
        """
        batch_ids = []

        for batch_file in self.base_path.glob("*.json"):
            if batch_file.suffix != '.json':
                continue

            batch_id = batch_file.stem

            # Apply filters if provided
            if org_id or status:
                batch = self.load_batch(batch_id)
                if org_id and batch.org_id != org_id:
                    continue
                if status and batch.status.value != status:
                    continue

            batch_ids.append(batch_id)

        return sorted(batch_ids)

    def delete_batch(self, batch_id: str):
        """Delete batch from storage"""
        batch_file = self.base_path / f"{batch_id}.json"

        if batch_file.exists():
            batch_file.unlink()
            print(f"✓ Deleted batch {batch_id}")
        else:
            print(f"✗ Batch {batch_id} not found")
