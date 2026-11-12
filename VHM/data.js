// Data awal yang diekstrak langsung dari file Excel: VHM SUB 2.xlsx
// Target: Half Marathon Sub 2 Jam (< 02:00:00 -> Pace target rerata <= 5:41 min/km)

const INITIAL_TRAINING_DATA = [
  {
    id: "week-1",
    weekNumber: 1,
    title: "WEEK 1",
    notes: "Fase adaptasi awal fondasi aerobik dan tempo pendek",
    sessions: [
      {
        id: "w1-s1",
        date: "2026-10-27",
        dayName: "Selasa, 27/10/2026",
        type: "easy_run",
        categoryTitle: "Easy Run",
        distance: 5.64,
        time: "45:00",
        timeMinutes: 45,
        pace: "7'59\"",
        hr: 148,
        location: "Indoor",
        notes: "Treadmill indoor steady run, HR terkontrol di Zone 2."
      },
      {
        id: "w1-s2",
        date: "2026-10-29",
        dayName: "Kamis, 29/10/2026",
        type: "tempo_run",
        categoryTitle: "Tempo Run",
        notes: "Latihan tempo pertama, 3 segmen terstruktur.",
        distance: 6.62,
        time: "45:00",
        timeMinutes: 45,
        pace: "6'47\"", // average pace
        hr: 155, // avg hr
        segments: [
          {
            name: "Easy Run (Warm Up)",
            distance: 2.0,
            time: "15:00",
            timeMinutes: 15,
            pace: "7'30\"",
            hr: 146
          },
          {
            name: "Tempo Run (Threshold)",
            distance: 3.37,
            time: "20:00",
            timeMinutes: 20,
            pace: "5'57\"",
            hr: 166
          },
          {
            name: "Easy Run (Cool Down)",
            distance: 1.25,
            time: "10:00",
            timeMinutes: 10,
            pace: "8'03\"",
            hr: 154
          }
        ]
      },
      {
        id: "w1-s3",
        date: "2026-11-01",
        dayName: "Minggu, 01/11/2026",
        type: "long_run",
        categoryTitle: "Long Run",
        distance: 12.63,
        time: "1:41:55",
        timeMinutes: 101.9,
        pace: "8'04\"",
        hr: 151,
        location: "Outdoor",
        notes: "Long run pertama untuk membangun daya tahan aerobik jarak 12km+."
      }
    ]
  },
  {
    id: "week-2",
    weekNumber: 2,
    title: "WEEK 2",
    notes: "Pengenalan interval speedwork 400m dan peningkatan tempo 5km",
    sessions: [
      {
        id: "w2-s1",
        date: "2026-11-03",
        dayName: "Selasa, 03/11/2026",
        type: "easy_run",
        categoryTitle: "Easy Run",
        distance: 6.24,
        time: "45:00",
        timeMinutes: 45,
        pace: "7'13\"",
        hr: 156,
        location: "Indoor",
        notes: "Recovery run dengan peningkatan jarak dibanding minggu lalu."
      },
      {
        id: "w2-s2",
        date: "2026-11-06",
        dayName: "Jumat, 06/11/2026",
        type: "interval_run",
        categoryTitle: "Interval Run",
        notes: "Interval 400m x 5 repetisi dengan pemanasan dan pendinginan.",
        distance: 5.14,
        time: "38:00",
        timeMinutes: 38,
        pace: "5'45\"",
        hr: 167,
        warmup: {
          name: "Warm Up",
          distance: 1.5,
          time: "12:00",
          pace: "8'17\"",
          hr: 151
        },
        setsTitle: "Interval (400m x 5)",
        sets: [
          { setNumber: 1, target: "400m", time: "2:08", pace: "5'21\"", hr: 151 },
          { setNumber: 2, target: "400m", time: "1:47", pace: "4'29\"", hr: 170 },
          { setNumber: 3, target: "400m", time: "1:49", pace: "4'33\"", hr: 181 },
          { setNumber: 4, target: "400m", time: "2:01", pace: "5'03\"", hr: 169 },
          { setNumber: 5, target: "400m", time: "2:03", pace: "5'08\"", hr: 178 }
        ],
        cooldown: {
          name: "Cool Down",
          distance: 1.64,
          time: "15:00",
          pace: "9'08\"",
          hr: 165
        }
      },
      {
        id: "w2-s3",
        date: "2026-11-07",
        dayName: "Sabtu, 07/11/2026",
        type: "tempo_run",
        categoryTitle: "Tempo Run",
        notes: "Tempo run 5km solid pace 6'17\" sebelum long run esok harinya.",
        distance: 6.75,
        time: "46:25",
        timeMinutes: 46.4,
        pace: "6'52\"",
        hr: 165,
        segments: [
          {
            name: "Easy Run (Warm Up)",
            distance: 0,
            time: "-",
            pace: "-",
            hr: null
          },
          {
            name: "Tempo Run Core",
            distance: 5.0,
            time: "31:25",
            pace: "6'17\"",
            hr: 163
          },
          {
            name: "Cool Down",
            distance: 1.75,
            time: "15:00",
            pace: "8'16\"",
            hr: 169
          }
        ]
      },
      {
        id: "w2-s4",
        date: "2026-11-08",
        dayName: "Minggu, 08/11/2026",
        type: "long_run",
        categoryTitle: "Long Run",
        distance: 10.0,
        time: "1:04:49",
        timeMinutes: 64.8,
        pace: "6'29\"",
        hr: 161,
        location: "Outdoor",
        notes: "Progress signifikan! Pace 6'29\" jauh lebih cepat dengan HR 161."
      }
    ]
  },
  {
    id: "week-3",
    weekNumber: 3,
    title: "WEEK 3",
    notes: "Peningkatan beban tempo berulang 6 menit x 3 repetisi",
    sessions: [
      {
        id: "w3-s1",
        date: "2026-11-10",
        dayName: "Selasa, 10/11/2026",
        type: "easy_run",
        categoryTitle: "Easy Run",
        distance: 6.28,
        time: "46:00",
        timeMinutes: 46,
        pace: "7'20\"",
        hr: 154,
        location: "Indoor",
        notes: "Easy run pembuka minggu ke-3 dengan pace konsisten 7'20\"."
      },
      {
        id: "w3-s2",
        date: "2026-11-12",
        dayName: "Kamis, 12/11/2026",
        type: "tempo_run",
        categoryTitle: "Tempo Run ( 6 menit x 3)",
        notes: "Tempo interval berbasis waktu: 3 blok x 6 menit pada pace target.",
        distance: 6.5,
        time: "43:00",
        timeMinutes: 43,
        pace: "6'15\"",
        hr: 164,
        segments: [
          {
            name: "Warm Up",
            distance: 2.0,
            time: "15:00",
            timeMinutes: 15,
            pace: "7'30\"",
            hr: 148
          },
          {
            name: "Set 1 Tempo",
            distance: 1.0,
            time: "06:00",
            timeMinutes: 6,
            pace: "6'00\"",
            hr: 165
          },
          {
            name: "Set 2 Tempo",
            distance: 1.0,
            time: "06:00",
            timeMinutes: 6,
            pace: "5'55\"",
            hr: 168
          },
          {
            name: "Set 3 Tempo",
            distance: 1.0,
            time: "06:00",
            timeMinutes: 6,
            pace: "5'50\"",
            hr: 172
          },
          {
            name: "Cool Down",
            distance: 1.5,
            time: "10:00",
            timeMinutes: 10,
            pace: "8'00\"",
            hr: 152
          }
        ]
      },
      {
        id: "w3-s3",
        date: "2026-11-15",
        dayName: "Minggu, 15/11/2026",
        type: "long_run",
        categoryTitle: "Long Run",
        distance: 14.0,
        time: "1:33:00",
        timeMinutes: 93,
        pace: "6'38\"",
        hr: 158,
        location: "Outdoor",
        notes: "Target long run progresif 14 km membangun aerobik menuju 21.1 km."
      }
    ]
  }
];

const SUB_2_CONFIG = {
  raceName: "Half Marathon Sub-2 (VHM SUB 2)",
  targetDistanceKm: 21.0975,
  targetTimeFormatted: "01:59:59",
  targetTimeSeconds: 7199,
  targetPaceFormatted: "5'41\"",
  targetPaceSeconds: 341, // 5 min 41 sec per km
  splits: [
    { checkpoint: "5K", distance: 5.0, targetTime: "00:28:25", avgPace: "5'41\"" },
    { checkpoint: "10K", distance: 10.0, targetTime: "00:56:50", avgPace: "5'41\"" },
    { checkpoint: "15K", distance: 15.0, targetTime: "01:25:15", avgPace: "5'41\"" },
    { checkpoint: "20K", distance: 20.0, targetTime: "01:53:40", avgPace: "5'41\"" },
    { checkpoint: "Finish (21.1K)", distance: 21.0975, targetTime: "01:59:59", avgPace: "5'41\"" }
  ],
  zones: [
    { zone: "Zone 1", name: "Recovery Run", range: "< 135 bpm", desc: "Pemulihan aktif & warm up / cool down" },
    { zone: "Zone 2", name: "Easy Run Base", range: "135 - 152 bpm", desc: "Membangun efisiensi mitokondria & endurance (70-80% porsi latihan)" },
    { zone: "Zone 3", name: "Aerobic / Steady", range: "153 - 164 bpm", desc: "Transisi aerobik ke maraton pace" },
    { zone: "Zone 4", name: "Tempo / Threshold", range: "165 - 175 bpm", desc: "Lactate threshold, menaikkan batas lelah tubuh" },
    { zone: "Zone 5", name: "Interval / VO2Max", range: "> 175 bpm", desc: "Kecepatan maksimal & efisiensi neuromuskular (repetisi 400m-1000m)" }
  ]
};

const DEFAULT_RACE_EVENT = {
  eventName: "VHM - Half Marathon Sub 2",
  raceDate: "2026-12-13T05:30:00",
  distanceKm: 21.0975,
  targetTime: "01:59:59",
  targetPace: "5'41\"",
  location: "Road Race Course",
  bibNumber: "SUB-200",
  notes: "Fokus race day: pacing konsisten 5'41\"/km, hidrasi di tiap water station, split negatif di km 15-21."
};

// Global exports for browser compatibility
if (typeof window !== 'undefined') {
  window.INITIAL_TRAINING_DATA = INITIAL_TRAINING_DATA;
  window.SUB_2_CONFIG = SUB_2_CONFIG;
  window.DEFAULT_RACE_EVENT = DEFAULT_RACE_EVENT;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INITIAL_TRAINING_DATA, SUB_2_CONFIG, DEFAULT_RACE_EVENT };
}
