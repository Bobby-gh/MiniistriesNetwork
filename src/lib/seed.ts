// Deterministic demo dataset so the app looks alive on first run.

import type { Alert, AttendanceRecord, DB, Member, Parish, Payment, Settings, Transfer } from "./types";
import { lastNMonths, lastNSundays, toISODate, uid } from "./format";

function mulberry32(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  dioceseName: "Diocese of Grace & Truth",
  dioceseSubtitle: "Parish & Finance Network",
  currency: "GHS",
  currencySymbol: "GH₵",
  duesMonthlyAmount: 50,
  funeralLevyAmount: 100,
  defaulterThresholdMonths: 3,
  buildingFundName: "New Sanctuary Project 2027",
  buildingFundTarget: 500000,
  alertSender: "Diocesan Office",
};

const parishSeeds = [
  {
    name: "St. Andrew's Cathedral",
    location: "Diocesan Headquarters, Ridge",
    priest: "Rt. Rev. Samuel Mensah",
    phone: "+233 24 431 0021",
    founded: "2003-09-14",
  },
  {
    name: "Christ Church Adenta",
    location: "Adenta Housing Down",
    priest: "Very Rev. Grace Owusu",
    phone: "+233 20 776 5514",
    founded: "2008-02-17",
  },
  {
    name: "Holy Trinity Kasoa",
    location: "Millennium City, Kasoa",
    priest: "Rev. Daniel Asare",
    phone: "+233 27 118 9032",
    founded: "2011-06-05",
  },
  {
    name: "Emmanuel Chapel Tema",
    location: "Community 25, Tema",
    priest: "Rev. Priscilla Boateng",
    phone: "+233 24 905 7781",
    founded: "2014-11-23",
  },
  {
    name: "St. Paul's Madina",
    location: "Madina Zongo",
    priest: "Rev. Francis Tetteh",
    phone: "+233 55 640 2298",
    founded: "2017-03-12",
  },
];

const ROSTER: [string, string, Member["role"], number, number][] = [
  // name, gender, role, parish index, years active
  ["Samuel", "Mensah", "Pastor", 0, 18],
  ["Abena", "Darko", "Deacon", 0, 9],
  ["Kwame", "Asante", "Member", 0, 7],
  ["Akosua", "Frimpong", "Women's Fellowship", 0, 11],
  ["Yaw", "Boateng", "Men's Fellowship", 0, 5],
  ["Efua", "Sarpong", "Choir", 0, 3],
  ["Grace", "Owusu", "Pastor", 1, 12],
  ["Kofi", "Amankwah", "Deacon", 1, 6],
  ["Adwoa", "Nkrumah", "Member", 1, 4],
  ["Kwabena", "Osei", "Youth", 1, 2],
  ["Afua", "Mensimah", "Sunday School Teacher", 1, 8],
  ["Daniel", "Asare", "Pastor", 2, 10],
  ["Esther", "Appiah", "Member", 2, 5],
  ["Nana", "Agyemang", "Men's Fellowship", 2, 6],
  ["Priscilla", "Ofori", "Choir", 2, 3],
  ["Kojo", "Antwi", "Youth", 2, 1],
  ["Comfort", "Baidoo", "Women's Fellowship", 2, 9],
  ["Priscilla", "Boateng", "Pastor", 3, 7],
  ["Michael", "Tetteh", "Deacon", 3, 4],
  ["Vida", "Agbeko", "Member", 3, 3],
  ["Isaac", "Nartey", "Usher", 3, 2],
  ["Patience", "Dzidzor", "Member", 3, 6],
  ["Francis", "Tetteh", "Pastor", 4, 6],
  ["Rita", "Asiedu", "Women's Fellowship", 4, 4],
  ["Bright", "Owusu", "Youth", 4, 2],
  ["Selina", "Agyapong", "Choir", 4, 3],
  ["Ephraim", "Boadu", "Men's Fellowship", 4, 5],
  ["Janet", "Quarshie", "Member", 4, 1],
];

const OCCUPATIONS = [
  "Teacher",
  "Nurse",
  "Trader",
  "Engineer",
  "Farmer",
  "Accountant",
  "Student",
  "Driver",
  "Hairdresser",
  "Civil Servant",
  "Merchant",
  "Lecturer",
];

export function buildSeedDB(): DB {
  const rng = mulberry32(20261019);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const today = new Date();

  const parishes: Parish[] = parishSeeds.map((p) => ({ ...p, id: uid("par") }));

  const members: Member[] = ROSTER.map(([first, last, role, parishIdx, years], i) => {
    const joined = new Date(today.getFullYear() - years, (i * 5) % 12, ((i * 7) % 26) + 1);
    const dob = new Date(joined.getFullYear() - (22 + ((i * 3) % 25)), (i * 3) % 12, ((i * 11) % 26) + 1);
    const status: Member["status"] = i === 10 || i === 25 ? "inactive" : "active";
    return {
      id: uid("mem"),
      membershipNo: `DN-${String(i + 1).padStart(4, "0")}`,
      firstName: first,
      lastName: last,
      gender: i % 2 === 0 ? "Male" : "Female",
      phone: `+233 ${pick(["24", "20", "27", "55", "54"])} ${String(100 + Math.floor(rng() * 899))} ${String(1000 + Math.floor(rng() * 8999))}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      address: `${pick(["House No. 4", "Akpome Flat 12", "Block B", "Nr. Presby School", "Plot 27"])} ${parishSeeds[parishIdx].location}`,
      parishId: parishes[parishIdx].id,
      role,
      joinDate: toISODate(joined),
      dob: toISODate(dob),
      occupation: pick(OCCUPATIONS),
      status,
      notes: "",
    };
  });

  const active = members.filter((m) => m.status === "active");

  const attendance: AttendanceRecord[] = [];
  const sundays = lastNSundays(10, today);
  for (const date of sundays) {
    for (const m of active) {
      const base = m.role === "Pastor" || m.role === "Deacon" ? 0.96 : 0.74;
      if (rng() < base) {
        attendance.push({ id: uid("att"), memberId: m.id, serviceDate: date, service: "Sunday Worship" });
      }
    }
    // mid-week services draw a smaller crowd
    for (const m of active) {
      if (rng() < 0.22) {
        const d = new Date(`${date}T12:00:00`);
        d.setDate(d.getDate() + 3); // Wednesday
        attendance.push({
          id: uid("att"),
          memberId: m.id,
          serviceDate: toISODate(d),
          service: rng() < 0.55 ? "Bible Study" : "Prayer Meeting",
        });
      }
    }
  }

  const payments: Payment[] = [];
  const months = lastNMonths(7, today);
  const ref = (p: string) => `${p}-${Math.floor(100000 + rng() * 899999)}`;

  months.forEach((month, mi) => {
    const isCurrent = mi === months.length - 1;
    // Monthly dues — some members consistently default
    for (const m of active) {
      const idx = members.findIndex((x) => x.id === m.id);
      const reliability = idx % 7 === 3 ? 0.12 : idx % 5 === 0 ? 0.55 : 0.9;
      if (rng() < reliability) {
        const day = 1 + Math.floor(rng() * 26);
        const date = `${month}-${String(day).padStart(2, "0")}`;
        if (date > toISODate(today)) continue;
        payments.push({
          id: uid("pay"),
          memberId: m.id,
          type: "dues",
          amount: DEFAULT_SETTINGS.duesMonthlyAmount,
          date,
          method: pick(["Cash", "Mobile Money", "Mobile Money", "Bank Transfer"]),
          reference: ref("DUE"),
          period: month,
          category: "Monthly Dues",
          note: "",
          createdBy: "Diocesan Office",
        });
      }
    }
    // Donations
    const donorPool = [...active].sort(() => rng() - 0.5).slice(0, 5 + Math.floor(rng() * 4));
    for (const d of donorPool) {
      const day = 1 + Math.floor(rng() * 27);
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (date > toISODate(today)) continue;
      payments.push({
        id: uid("pay"),
        memberId: rng() < 0.12 ? "" : d.id,
        type: "donation",
        amount: pick([100, 200, 200, 300, 500, 1000]),
        date,
        method: pick(["Cash", "Mobile Money", "Bank Transfer"]),
        reference: ref("DON"),
        category: pick(["General Fund", "Welfare", "Missions & Outreach", "Sunday School", "Choir & Media"]),
        note: "",
        createdBy: "Diocesan Office",
      });
    }
    // Building project fund
    for (const m of active.slice(0, 14)) {
      if (rng() < 0.6) {
        const day = 3 + Math.floor(rng() * 22);
        const date = `${month}-${String(day).padStart(2, "0")}`;
        if (date > toISODate(today)) continue;
        payments.push({
          id: uid("pay"),
          memberId: m.id,
          type: "building",
          amount: pick([200, 300, 500, 500, 1000, 2000]),
          date,
          method: pick(["Cash", "Mobile Money", "Bank Transfer"]),
          reference: ref("BLD"),
          category: DEFAULT_SETTINGS.buildingFundName,
          note: "",
          createdBy: "Diocesan Office",
        });
      }
    }
    // Funeral levy
    if (rng() < 0.8) {
      const respect = pick([
        "Late Madam Akosua Frimpong",
        "Late Mr. Yaw Darko",
        "Late Mrs. Grace Amponsah",
        "Late Nana Kofi Bediako",
      ]);
      for (const m of [...active].sort(() => rng() - 0.5).slice(0, 6 + Math.floor(rng() * 8))) {
        const day = 2 + Math.floor(rng() * 24);
        const date = `${month}-${String(day).padStart(2, "0")}`;
        if (date > toISODate(today)) continue;
        payments.push({
          id: uid("pay"),
          memberId: m.id,
          type: "funeral",
          amount: DEFAULT_SETTINGS.funeralLevyAmount,
          date,
          method: pick(["Cash", "Mobile Money"]),
          reference: ref("FNL"),
          category: respect,
          note: "",
          createdBy: "Diocesan Office",
        });
      }
    }
    // Other payments (sparse)
    if (!isCurrent || rng() < 0.5) {
      for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
        const day = 1 + Math.floor(rng() * 25);
        const date = `${month}-${String(day).padStart(2, "0")}`;
        if (date > toISODate(today)) continue;
        payments.push({
          id: uid("pay"),
          memberId: pick(active).id,
          type: "other",
          amount: pick([25, 50, 80, 120, 150]),
          date,
          method: pick(["Cash", "Mobile Money"]),
          reference: ref("OTH"),
          category: pick([
            "Event Fee",
            "Membership Subscription",
            "Hall Rental",
            "Refreshments",
            "Transport",
            "Welfare Contribution",
            "Penalty",
          ]),
          note: "",
          createdBy: "Diocesan Office",
        });
      }
    }
  });

  const transfers: Transfer[] = [
    {
      id: uid("trf"),
      memberId: members[10].id,
      fromParishId: parishes[0].id,
      toParishId: parishes[2].id,
      date: toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 14)),
      reason: "Relocation to Kasoa for work",
      status: "approved",
    },
    {
      id: uid("trf"),
      memberId: members[19].id,
      fromParishId: parishes[1].id,
      toParishId: parishes[3].id,
      date: toISODate(new Date(today.getFullYear(), today.getMonth(), 5)),
      reason: "Family moved to Tema Community 25",
      status: "pending",
    },
    {
      id: uid("trf"),
      memberId: members[25].id,
      fromParishId: parishes[4].id,
      toParishId: parishes[0].id,
      date: toISODate(new Date(today.getFullYear(), today.getMonth(), 11)),
      reason: "Request to serve in the cathedral choir",
      status: "pending",
    },
  ];

  const defaulterish = members.filter((m) => m.status === "active" && Number(m.membershipNo.slice(-1)) % 7 === 3);
  const alerts: Alert[] = defaulterish.slice(0, 3).map((m) => ({
    id: uid("alr"),
    kind: "defaulter",
    memberId: m.id,
    title: "Dues arrears notice",
    message: `Dear ${m.firstName}, your monthly dues are in arrears. Please regularise your account with the Diocesan Office.`,
    channel: "SMS",
    date: toISODate(new Date(today.getFullYear(), today.getMonth(), 9)),
    status: "sent",
    sentAt: toISODate(new Date(today.getFullYear(), today.getMonth(), 9)),
  }));
  alerts.push({
    id: uid("alr"),
    kind: "payment",
    memberId: members[3].id,
    title: "Dues payment received",
    message: "Thank you for your dues payment. Your receipt reference has been issued.",
    channel: "WhatsApp",
    date: toISODate(new Date(today.getFullYear(), today.getMonth(), 15)),
    status: "sent",
    sentAt: toISODate(new Date(today.getFullYear(), today.getMonth(), 15)),
  });
  alerts.push({
    id: uid("alr"),
    kind: "payment",
    memberId: members[13].id,
    title: "Building fund pledge reminder",
    message: "Gentle reminder of your monthly pledge toward the New Sanctuary Project. Kindly fulfil it before month end.",
    channel: "SMS",
    date: toISODate(today),
    status: "queued",
  });

  return {
    parishes,
    members,
    attendance,
    payments,
    transfers,
    alerts,
    settings: { ...DEFAULT_SETTINGS },
  };
}
