import { PCG64 } from './pcg.js';
import {
  Scenario,
  SimulationConfig,
  RunMetrics,
  SimEvent,
  EventType,
  Vehicle,
  VARIABILITY_CV
} from '../types/index.js';

/**
 * Priority queue for event scheduling (min-heap by time)
 */
class EventQueue {
  private heap: SimEvent[] = [];

  push(event: SimEvent): void {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): SimEvent | undefined {
    if (this.heap.length === 0) return undefined;

    const result = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return result;
  }

  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].time <= this.heap[index].time) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].time < this.heap[smallest].time) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].time < this.heap[smallest].time) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

/**
 * M/M/c Queue for entry/exit processing
 */
class MMcQueue {
  private channels: number;
  private busyUntil: number[] = [];
  private waitingQueue: { vehicleId: number; arrivalTime: number }[] = [];

  constructor(channels: number) {
    this.channels = channels;
    this.busyUntil = new Array(channels).fill(0);
  }

  /**
   * Attempt to enter the queue, returns service start time
   * and whether we had to wait in queue
   */
  enqueue(vehicleId: number, currentTime: number, serviceTime: number): {
    serviceStartTime: number;
    serviceEndTime: number;
    waitTime: number;
  } {
    // Find the channel that becomes free earliest
    let earliestFreeTime = Math.min(...this.busyUntil);
    let earliestChannel = this.busyUntil.indexOf(earliestFreeTime);

    const serviceStartTime = Math.max(currentTime, earliestFreeTime);
    const serviceEndTime = serviceStartTime + serviceTime;
    const waitTime = serviceStartTime - currentTime;

    this.busyUntil[earliestChannel] = serviceEndTime;

    return { serviceStartTime, serviceEndTime, waitTime };
  }

  /**
   * Get current queue length (vehicles waiting, not being served)
   */
  getQueueLength(currentTime: number): number {
    return this.busyUntil.filter(t => t > currentTime).length;
  }

  /**
   * Reset the queue state
   */
  reset(): void {
    this.busyUntil = new Array(this.channels).fill(0);
    this.waitingQueue = [];
  }
}

/**
 * Calculate lognormal distribution parameters from mean and CV
 */
function lognormalParams(mean: number, cv: number): { mu: number; sigma: number } {
  const sigma2 = Math.log(1 + cv * cv);
  const sigma = Math.sqrt(sigma2);
  const mu = Math.log(mean) - sigma2 / 2;
  return { mu, sigma };
}

/**
 * Single simulation run
 */
export function runSimulation(
  scenario: Scenario,
  config: SimulationConfig,
  rng: PCG64
): RunMetrics {
  const totalCapacity = scenario.capacity.floors * scenario.capacity.spots_per_floor;

  // Calculate simulation duration
  const totalDuration = config.warm_up_minutes +
    scenario.demand.peak_start_minute +
    scenario.demand.peak_duration_minutes +
    config.stabilization_buffer_minutes;

  // Lognormal parameters for parking duration
  const cv = VARIABILITY_CV[scenario.parking_duration.variability];
  const { mu, sigma } = lognormalParams(scenario.parking_duration.mean_minutes, cv);

  // Service time parameters (convert to minutes)
  const entryServiceRate = 60 / scenario.entry.mean_service_time_seconds; // services per minute
  const exitServiceRate = 60 / scenario.exit.mean_service_time_seconds;

  // Initialize queues
  const entryQueue = new MMcQueue(scenario.entry.channels);
  const exitQueue = new MMcQueue(scenario.exit.channels);

  // Event queue
  const eventQueue = new EventQueue();

  // State
  let currentOccupancy = 0;  // Vehicles currently parked
  let pendingEntries = 0;    // Vehicles in entry queue (reserving spots)
  let vehicleCounter = 0;
  const vehicles = new Map<number, Vehicle>();

  // Metrics
  const metrics: RunMetrics = {
    totalArrivals: 0,
    totalExits: 0,
    rejections: 0,
    entryWaitTimes: [],
    exitWaitTimes: [],
    occupancySamples: [],
    maxOccupancy: 0,
    timeAtFullCapacity: 0,
    maxEntryQueue: 0,
    maxExitQueue: 0,
    exitQueueSamples: []
  };

  // Time tracking for capacity metrics
  let lastOccupancyChangeTime = 0;
  let timeFullAccumulator = 0;

  /**
   * Get arrival rate at a given time (non-homogeneous Poisson)
   */
  function getArrivalRate(time: number): number {
    const peakStart = config.warm_up_minutes + scenario.demand.peak_start_minute;
    const peakEnd = peakStart + scenario.demand.peak_duration_minutes;

    if (time >= peakStart && time < peakEnd) {
      return scenario.demand.arrival_rate_per_hour * scenario.demand.peak_multiplier / 60;
    }
    return scenario.demand.arrival_rate_per_hour / 60;
  }

  /**
   * Schedule next arrival using thinning algorithm for non-homogeneous Poisson
   */
  function scheduleNextArrival(currentTime: number): void {
    // Maximum possible rate (during peak)
    const maxRate = scenario.demand.arrival_rate_per_hour * scenario.demand.peak_multiplier / 60;

    let time = currentTime;
    while (time < totalDuration) {
      // Generate candidate inter-arrival time using max rate
      const interArrival = rng.exponential(maxRate);
      time += interArrival;

      if (time >= totalDuration) break;

      // Accept/reject based on actual rate at this time
      const actualRate = getArrivalRate(time);
      if (rng.random() < actualRate / maxRate) {
        vehicleCounter++;
        eventQueue.push({
          time,
          type: 'ARRIVAL',
          vehicleId: vehicleCounter
        });
        break;
      }
    }
  }

  /**
   * Check if time is within metrics collection period (after warm-up)
   */
  function isMetricsTime(time: number): boolean {
    return time >= config.warm_up_minutes;
  }

  /**
   * Update occupancy-related metrics
   */
  function updateOccupancyMetrics(currentTime: number, newOccupancy: number): void {
    if (isMetricsTime(lastOccupancyChangeTime)) {
      const duration = currentTime - Math.max(lastOccupancyChangeTime, config.warm_up_minutes);
      if (currentOccupancy === totalCapacity && duration > 0) {
        timeFullAccumulator += duration;
      }
    }
    lastOccupancyChangeTime = currentTime;
    currentOccupancy = newOccupancy;
    metrics.maxOccupancy = Math.max(metrics.maxOccupancy, newOccupancy);
  }

  // Schedule first arrival
  scheduleNextArrival(0);

  // Main simulation loop
  let lastSampleTime = 0;
  const sampleInterval = 1; // Sample every minute

  while (!eventQueue.isEmpty()) {
    const event = eventQueue.pop()!;
    const time = event.time;

    // Take periodic samples for averaging
    while (lastSampleTime + sampleInterval <= time) {
      lastSampleTime += sampleInterval;
      if (isMetricsTime(lastSampleTime)) {
        metrics.occupancySamples.push(currentOccupancy);
        metrics.exitQueueSamples.push(exitQueue.getQueueLength(lastSampleTime));
      }
    }

    switch (event.type) {
      case 'ARRIVAL': {
        if (isMetricsTime(time)) {
          metrics.totalArrivals++;
        }

        // Check capacity (include pending entries that have reserved spots)
        if (currentOccupancy + pendingEntries >= totalCapacity) {
          // Reject - lot is full
          if (isMetricsTime(time)) {
            metrics.rejections++;
          }
          vehicles.set(event.vehicleId, {
            id: event.vehicleId,
            arrivalTime: time,
            rejected: true
          });
        } else {
          // Accept - reserve a spot and process through entry
          pendingEntries++;

          const serviceTime = rng.exponential(entryServiceRate);
          const { serviceEndTime, waitTime } = entryQueue.enqueue(
            event.vehicleId,
            time,
            serviceTime
          );

          if (isMetricsTime(time)) {
            metrics.entryWaitTimes.push(waitTime * 60); // Convert to seconds
            metrics.maxEntryQueue = Math.max(
              metrics.maxEntryQueue,
              entryQueue.getQueueLength(time) + 1
            );
          }

          // Vehicle occupies a spot immediately after entry complete
          eventQueue.push({
            time: serviceEndTime,
            type: 'ENTRY_COMPLETE',
            vehicleId: event.vehicleId
          });

          const parkingDuration = rng.lognormal(mu, sigma);

          vehicles.set(event.vehicleId, {
            id: event.vehicleId,
            arrivalTime: time,
            entryQueueStartTime: time,
            parkingDuration,
            rejected: false
          });
        }

        // Schedule next arrival
        scheduleNextArrival(time);
        break;
      }

      case 'ENTRY_COMPLETE': {
        const vehicle = vehicles.get(event.vehicleId);
        if (!vehicle || vehicle.rejected) break;

        vehicle.entryCompleteTime = time;

        // Convert pending entry to actual occupancy
        pendingEntries--;
        updateOccupancyMetrics(time, currentOccupancy + 1);

        // Schedule exit
        const exitTime = time + vehicle.parkingDuration!;
        eventQueue.push({
          time: exitTime,
          type: 'EXIT_START',
          vehicleId: event.vehicleId
        });
        break;
      }

      case 'EXIT_START': {
        const vehicle = vehicles.get(event.vehicleId);
        if (!vehicle || vehicle.rejected) break;

        vehicle.exitStartTime = time;
        vehicle.exitQueueStartTime = time;

        // Decrement occupancy (spot freed when vehicle starts to exit)
        updateOccupancyMetrics(time, currentOccupancy - 1);

        // Process through exit queue
        const serviceTime = rng.exponential(exitServiceRate);
        const { serviceEndTime, waitTime } = exitQueue.enqueue(
          event.vehicleId,
          time,
          serviceTime
        );

        if (isMetricsTime(time)) {
          metrics.exitWaitTimes.push(waitTime); // Already in minutes
          metrics.maxExitQueue = Math.max(
            metrics.maxExitQueue,
            exitQueue.getQueueLength(time) + 1
          );
        }

        eventQueue.push({
          time: serviceEndTime,
          type: 'EXIT_COMPLETE',
          vehicleId: event.vehicleId
        });
        break;
      }

      case 'EXIT_COMPLETE': {
        const vehicle = vehicles.get(event.vehicleId);
        if (!vehicle || vehicle.rejected) break;

        vehicle.exitCompleteTime = time;

        if (isMetricsTime(vehicle.exitStartTime!)) {
          metrics.totalExits++;
        }

        // Clean up vehicle
        vehicles.delete(event.vehicleId);
        break;
      }
    }
  }

  // Final time full calculation
  if (isMetricsTime(lastOccupancyChangeTime) && currentOccupancy === totalCapacity) {
    const duration = totalDuration - Math.max(lastOccupancyChangeTime, config.warm_up_minutes);
    if (duration > 0) {
      timeFullAccumulator += duration;
    }
  }

  metrics.timeAtFullCapacity = timeFullAccumulator;

  return metrics;
}
