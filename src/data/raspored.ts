// Raspored časova — Primenjene računarske nauke i informatika, zimski semestar 2026/27.
// Javni raspored fakulteta; grupa se bira po predmetu u aplikaciji.

export interface ClassSlot {
  day: number // 0 = ponedeljak
  group: string // "SVI" ili broj grupe
  from: string
  to: string
  room: string
  type: 'pred' | 'vezbe'
  subject: string // ključ predmeta
  teacher: string
}

export const RASPORED_SUBJECTS: Record<string, { name: string; short: string }> = {
  BP2: { name: 'Baze podataka 2', short: 'BP2' },
  RG: { name: 'Računarska grafika', short: 'RG' },
  ISA: { name: 'Internet softverske arhitekture', short: 'ISA' },
  PS: { name: 'Projektovanje softvera', short: 'PS' },
  SC: { name: 'Soft kompjuting', short: 'SC' },
}

const s = (
  day: number,
  group: string,
  from: string,
  to: string,
  room: string,
  type: 'pred' | 'vezbe',
  subject: string,
  teacher: string,
): ClassSlot => ({ day, group, from, to, room, type, subject, teacher })

export const RASPORED: ClassSlot[] = [
  // Ponedeljak
  s(0, '4', '07:00', '08:30', 'MI A2-2', 'vezbe', 'BP2', 'Miroslav Tomić'),
  s(0, '5', '08:45', '10:15', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  s(0, '6', '08:45', '10:15', 'AR2', 'vezbe', 'ISA', 'Ivana Kovačević'),
  s(0, '1', '10:30', '12:00', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  s(0, '5', '10:30', '12:00', 'AR2', 'vezbe', 'ISA', 'Ivana Kovačević'),
  s(0, 'SVI', '12:15', '14:00', 'A3', 'pred', 'ISA', 'dr Milan Stojkov'),
  // Utorak
  s(1, 'SVI', '07:15', '09:00', 'NTP-A', 'pred', 'BP2', 'dr Milan Čeliković'),
  s(1, 'SVI', '09:15', '12:00', 'NTP-A', 'pred', 'SC', 'dr Željko Vuković'),
  s(1, 'SVI', '12:15', '15:00', 'A2', 'pred', 'RG', 'dr Dragan Ivetić'),
  // Sreda
  s(2, '6', '07:00', '08:30', 'MI A2-2', 'vezbe', 'BP2', 'Nataša Radmilović'),
  s(2, '7', '07:00', '08:30', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  s(2, 'SVI', '09:15', '12:00', 'A3', 'pred', 'PS', 'dr Nikola Luburić'),
  s(2, '5', '12:15', '13:45', 'MI A2-2', 'vezbe', 'BP2', 'Milana Dobrić'),
  s(2, '4', '12:30', '14:00', 'NTP-307', 'vezbe', 'ISA', 'Novi saradnik RA1'),
  s(2, '7', '14:00', '15:30', 'NTP-316', 'vezbe', 'BP2', 'Milana Dobrić'),
  s(2, '5', '14:30', '16:00', 'F 315', 'vezbe', 'PS', 'Luka Dorić'),
  // Četvrtak
  s(3, '1', '08:00', '09:30', 'F 315', 'vezbe', 'PS', 'Simona Prokić'),
  s(3, '2', '08:00', '09:30', 'MI A2-2', 'vezbe', 'BP2', 'Veljko Bubnjević'),
  s(3, '4', '08:45', '11:15', 'MI A2-4', 'vezbe', 'SC', 'dr Aleksandra Kaplar'),
  s(3, '6', '09:30', '12:00', 'INT 1', 'vezbe', 'SC', 'Dragan Vidaković'),
  s(3, '7', '09:45', '11:15', 'F 315', 'vezbe', 'PS', 'Simona Prokić'),
  s(3, '1', '09:45', '11:15', 'MI A2-2', 'vezbe', 'BP2', 'Veljko Bubnjević'),
  s(3, '5', '11:30', '14:00', 'MI A2-4', 'vezbe', 'SC', 'dr Aleksandra Kaplar'),
  s(3, '7', '11:45', '13:15', 'NTP-309', 'vezbe', 'ISA', 'Milica Đumić'),
  s(3, '3', '12:15', '13:45', 'F 315', 'vezbe', 'PS', 'Danijel Radaković'),
  s(3, '7', '13:30', '16:00', 'NTP-316', 'vezbe', 'SC', 'Teodor Sakal Francišković'),
  s(3, '2', '14:00', '15:30', 'F 315', 'vezbe', 'PS', 'Danijel Radaković'),
  s(3, '3', '15:00', '16:30', 'MI A2-2', 'vezbe', 'BP2', 'Veljko Bubnjević'),
  s(3, '3', '16:45', '18:15', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  // Petak
  s(4, '6', '08:00', '09:30', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  s(4, '2', '08:00', '09:30', 'L4 (RC)', 'vezbe', 'ISA', 'Milica Đumić'),
  s(4, '6', '09:45', '11:15', 'F 315', 'vezbe', 'PS', 'Simona Prokić'),
  s(4, '2', '09:45', '11:15', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
  s(4, '1', '09:45', '12:15', 'NTP-309', 'vezbe', 'SC', 'dr Aleksandra Kaplar'),
  s(4, '3', '11:30', '14:00', 'L4 (RC)', 'vezbe', 'SC', 'Filip Volarić'),
  s(4, '2', '11:30', '14:00', 'NTP-311', 'vezbe', 'SC', 'Dragan Vidaković'),
  s(4, '1', '12:30', '14:00', 'NTP-309', 'vezbe', 'ISA', 'Novi saradnik RA2'),
  s(4, '4', '13:15', '14:45', 'F 315', 'vezbe', 'PS', 'Danijel Radaković'),
  s(4, '3', '14:15', '15:45', 'AR3', 'vezbe', 'ISA', 'Novi saradnik RA2'),
  s(4, '4', '15:00', '16:30', 'F 318', 'vezbe', 'RG', 'Vasilije Marković'),
]

export const ALL_GROUPS = ['1', '2', '3', '4', '5', '6', '7']
