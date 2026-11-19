import type { Room } from "./types";

export const SAMPLE_ROOMS: Room[] = [
  {
    id: "A101",
    name: "Lecture Hall A",
    building: "Engineering Block",
    capacity: 120,
    blocked: false,
    bookings: [
      { start: 540, end: 600, bookedBy: "Dr. Chen" },
      { start: 780, end: 840, bookedBy: "Prof. Lopez" },
    ],
  },
  {
    id: "B204",
    name: "Seminar Room B",
    building: "Science Wing",
    capacity: 30,
    blocked: false,
    bookings: [
      { start: 600, end: 660, bookedBy: "Study Group Alpha" },
      { start: 900, end: 960, bookedBy: "Faculty Meeting" },
    ],
  },
  {
    id: "C310",
    name: "Computer Lab C",
    building: "IT Center",
    capacity: 40,
    blocked: true,
    bookings: [
      { start: 480, end: 540, bookedBy: "Maintenance" },
    ],
  },
  {
    id: "D105",
    name: "Project Room D",
    building: "Innovation Hub",
    capacity: 12,
    blocked: false,
    bookings: [
      { start: 720, end: 780, bookedBy: "Robotics Team" },
      { start: 1020, end: 1080, bookedBy: "Design Sprint" },
    ],
  },
];
