import { Job, PunchType, TimeEntry, LeaveSiteAction, GeofenceReminder } from '../types';
import { GEOFENCE_RADIUS_METERS, MOCK_TIME_ENTRIES, ESTIMATED_HOURLY_RATE } from '../constants';

class TimeClockService {
  private entries: TimeEntry[] = [...MOCK_TIME_ENTRIES];
  private reminders: GeofenceReminder[] = [];

  // Haversine formula to calculate distance between two points in meters
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      }
    });
  }

  async punch(userId: string, userName: string, job: Job | null, type: PunchType, note?: string): Promise<TimeEntry> {
    const position = await this.getCurrentPosition();
    const { latitude, longitude, accuracy } = position.coords;

    let inBounds = true; // Default to true if no job is specified (no geofence to fail)
    let distanceFromSite = undefined;

    if (job && job.latitude && job.longitude) {
      distanceFromSite = this.calculateDistance(latitude, longitude, job.latitude, job.longitude);
      inBounds = distanceFromSite <= GEOFENCE_RADIUS_METERS;
    }

    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      userId,
      userName,
      jobId: job?.id || 'general-work',
      jobNumber: job?.jobNumber || 'GENERAL',
      type,
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        accuracy,
        inBounds,
        distanceFromSite
      },
      note,
      isException: job ? !inBounds : false
    };

    this.entries.push(entry);
    return entry;
  }

  async logGeofenceExit(userId: string, jobId: string, action: LeaveSiteAction, note?: string): Promise<GeofenceReminder> {
    const position = await this.getCurrentPosition();
    const { latitude, longitude } = position.coords;

    const reminder: GeofenceReminder = {
      id: `gr-${Date.now()}`,
      userId,
      jobId,
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude
      },
      actionTaken: action,
      note
    };

    this.reminders.push(reminder);
    return reminder;
  }

  getTimeEntries(): TimeEntry[] {
    return this.entries;
  }

  getReminders(): GeofenceReminder[] {
    return this.reminders;
  }

  getActiveEntry(userId: string): TimeEntry | undefined {
    const userEntries = this.entries
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (userEntries.length > 0 && userEntries[0].type === PunchType.CHECK_IN) {
      return userEntries[0];
    }
    return undefined;
  }

  getLabourSummary(jobId: string): { totalHours: number; estimatedCost: number } {
    const jobEntries = this.entries
      .filter(e => e.jobId === jobId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalMs = 0;
    const userLastCheckIn: Record<string, number> = {};

    for (const entry of jobEntries) {
      const time = new Date(entry.timestamp).getTime();
      if (entry.type === PunchType.CHECK_IN) {
        userLastCheckIn[entry.userId] = time;
      } else if (entry.type === PunchType.CHECK_OUT && userLastCheckIn[entry.userId]) {
        totalMs += time - userLastCheckIn[entry.userId];
        delete userLastCheckIn[entry.userId];
      }
    }

    const totalHours = totalMs / (1000 * 60 * 60);
    const estimatedCost = totalHours * ESTIMATED_HOURLY_RATE;

    return {
      totalHours: Number(totalHours.toFixed(2)),
      estimatedCost: Number(estimatedCost.toFixed(2))
    };
  }
}

export const timeClockService = new TimeClockService();
