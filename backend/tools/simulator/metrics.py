"""
Metrics collection for load testing scenarios.
Tracks trips, latencies, and concurrent load.
"""
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class SimulatorMetrics:
    """Metrics for simulation report."""

    started_at: datetime = field(default_factory=datetime.now)
    trips_created: int = 0
    trips_accepted: int = 0
    trips_completed: int = 0
    trips_cancelled: int = 0
    trips_cancel_failed: int = 0
    accept_failures: int = 0
    driver_skipped_cancelled: int = 0

    # Latency tracking (seconds)
    _accept_latencies: list[float] = field(default_factory=list)
    _complete_latencies: list[float] = field(default_factory=list)
    _trip_created_at: dict[str, float] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    # Concurrent trips
    _concurrent_trips: int = 0
    _max_concurrent_trips: int = 0

    def record_trip_created(self, trip_id: str) -> None:
        """Record trip creation timestamp for latency calculation."""
        with self._lock:
            self.trips_created += 1
            self._trip_created_at[trip_id] = datetime.now().timestamp()
            self._concurrent_trips += 1
            if self._concurrent_trips > self._max_concurrent_trips:
                self._max_concurrent_trips = self._concurrent_trips

    def record_accept(self, trip_id: str) -> Optional[float]:
        """Record accept and return accept_latency in seconds, or None if no created_at."""
        with self._lock:
            self.trips_accepted += 1
            created_at = self._trip_created_at.get(trip_id)
            if created_at is not None:
                latency = datetime.now().timestamp() - created_at
                self._accept_latencies.append(latency)
                return latency
            return None

    def record_complete(self, trip_id: str) -> Optional[float]:
        """Record completion and return complete_latency in seconds."""
        with self._lock:
            self.trips_completed += 1
            self._concurrent_trips = max(0, self._concurrent_trips - 1)
            created_at = self._trip_created_at.pop(trip_id, None)
            if created_at is not None:
                latency = datetime.now().timestamp() - created_at
                self._complete_latencies.append(latency)
                return latency
            return None

    def record_cancel(self, trip_id: str) -> None:
        """Record cancellation (decrement concurrent)."""
        with self._lock:
            self.trips_cancelled += 1
            self._concurrent_trips = max(0, self._concurrent_trips - 1)
            self._trip_created_at.pop(trip_id, None)

    def record_cancel_failed(self) -> None:
        with self._lock:
            self.trips_cancel_failed += 1

    def record_accept_failure(self) -> None:
        with self._lock:
            self.accept_failures += 1

    def record_driver_skipped_cancelled(self, trip_id: str) -> None:
        """Driver skipped because passenger cancelled."""
        with self._lock:
            self.driver_skipped_cancelled += 1
            self._concurrent_trips = max(0, self._concurrent_trips - 1)
            self._trip_created_at.pop(trip_id, None)

    @property
    def avg_accept_latency(self) -> Optional[float]:
        with self._lock:
            if not self._accept_latencies:
                return None
            return sum(self._accept_latencies) / len(self._accept_latencies)

    @property
    def avg_complete_latency(self) -> Optional[float]:
        with self._lock:
            if not self._complete_latencies:
                return None
            return sum(self._complete_latencies) / len(self._complete_latencies)

    @property
    def max_concurrent_trips(self) -> int:
        return self._max_concurrent_trips

    def simulation_report(self) -> str:
        """Generate SIMULATION REPORT for final output."""
        elapsed = (datetime.now() - self.started_at).total_seconds()
        avg_accept = self.avg_accept_latency
        avg_complete = self.avg_complete_latency

        lines = [
            "",
            "=" * 60,
            "SIMULATION REPORT",
            "=" * 60,
            f"  Duration:              {elapsed:.0f} s",
            f"  Trips created:         {self.trips_created}",
            f"  Trips accepted:        {self.trips_accepted}",
            f"  Trips completed:       {self.trips_completed}",
            f"  Trips cancelled:       {self.trips_cancelled}",
            f"  Cancel failed:         {self.trips_cancel_failed}",
            f"  Accept failures:       {self.accept_failures}",
            f"  Driver skipped:        {self.driver_skipped_cancelled}",
            f"  Avg accept latency:    {avg_accept:.2f} s" if avg_accept is not None else "  Avg accept latency:    N/A",
            f"  Avg complete latency:  {avg_complete:.2f} s" if avg_complete is not None else "  Avg complete latency:  N/A",
            f"  Peak concurrent trips:  {self.max_concurrent_trips}",
            "=" * 60,
        ]
        return "\n".join(lines)
