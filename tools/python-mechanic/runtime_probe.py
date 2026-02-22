#!/usr/bin/env python3
"""
Runtime Probe for UI System Monitoring
Detects hangs, memory leaks, and performance issues
"""

import faulthandler
import tracemalloc
import sys
import time
import logging
from typing import Dict, List, Any
from pathlib import Path

class RuntimeProbe:
    def __init__(self):
        self.start_time = time.time()
        self.memory_snapshots: List[Dict[str, Any]] = []
        self.error_count = 0
        self.hang_threshold = 30.0  # seconds
        
    def start_monitoring(self):
        """Start all monitoring systems"""
        # Enable fault handler for crashes
        faulthandler.enable()
        
        # Start memory tracing
        tracemalloc.start()
        
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('runtime_probe.log'),
                logging.StreamHandler()
            ]
        )
        
        logging.info("🔍 Runtime Probe started")
        self.take_memory_snapshot("initial")
        
    def take_memory_snapshot(self, label: str):
        """Take a memory snapshot for comparison"""
        if tracemalloc.is_tracing():
            snapshot = tracemalloc.take_snapshot()
            self.memory_snapshots.append({
                'label': label,
                'timestamp': time.time(),
                'snapshot': snapshot
            })
            logging.info(f"📊 Memory snapshot: {label}")
    
    def check_for_hangs(self, operation_name: str):
        """Check if an operation is taking too long"""
        def hang_detector():
            start_time = time.time()
            while True:
                if time.time() - start_time > self.hang_threshold:
                    logging.error(f"🚨 HANG DETECTED in {operation_name}!")
                    self.dump_stack_trace()
                    break
                time.sleep(1)
        
        return hang_detector
    
    def dump_stack_trace(self):
        """Dump current stack trace for debugging"""
        import traceback
        stack_trace = traceback.format_stack()
        logging.error("📋 Stack trace dump:")
        for line in stack_trace:
            logging.error(line.strip())
    
    def analyze_memory_growth(self):
        """Analyze memory growth between snapshots"""
        if len(self.memory_snapshots) < 2:
            return
        
        initial = self.memory_snapshots[0]['snapshot']
        latest = self.memory_snapshots[-1]['snapshot']
        
        stats = latest.compare_to(initial)
        
        if stats:
            total_diff = sum(stat.size_diff for stat in stats)
            logging.info(f"📈 Memory growth: {total_diff / 1024 / 1024:.2f} MB")
            
            # Top memory consumers
            for stat in stats[:5]:
                logging.info(f"  {stat.traceback.format()}: +{stat.size_diff / 1024:.1f} KB")
    
    def check_ui_health(self) -> Dict[str, Any]:
        """Check overall UI system health"""
        health_report = {
            'uptime': time.time() - self.start_time,
            'memory_snapshots': len(self.memory_snapshots),
            'error_count': self.error_count,
            'memory_growth': 0,
            'status': 'healthy'
        }
        
        # Analyze memory growth
        self.analyze_memory_growth()
        
        # Check for issues
        if self.error_count > 10:
            health_report['status'] = 'degraded'
            logging.warning("⚠️ High error count detected")
        
        return health_report
    
    def cleanup(self):
        """Clean up monitoring resources"""
        if tracemalloc.is_tracing():
            tracemalloc.stop()
        logging.info("🧹 Runtime Probe stopped")

# Example usage
if __name__ == "__main__":
    probe = RuntimeProbe()
    probe.start_monitoring()
    
    try:
        # Simulate some work
        time.sleep(2)
        probe.take_memory_snapshot("after_work")
        
        # Check health
        health = probe.check_ui_health()
        print(f"Health Report: {health}")
        
    finally:
        probe.cleanup()
