// src/data/universities.ts
//
// All 26 public universities in South Africa, alphabetical. Used for the
// university dropdown at signup and anywhere else the app needs to show
// or validate against the full list.

export const SOUTH_AFRICAN_UNIVERSITIES: string[] = [
  'Cape Peninsula University of Technology',
  'Central University of Technology',
  'Durban University of Technology',
  'Mangosuthu University of Technology',
  'Nelson Mandela University',
  'North-West University',
  'Rhodes University',
  'Sefako Makgatho Health Sciences University',
  'Sol Plaatje University',
  'Stellenbosch University',
  'Tshwane University of Technology',
  'University of Cape Town',
  'University of Fort Hare',
  'University of Johannesburg',
  'University of KwaZulu-Natal',
  'University of Limpopo',
  'University of Mpumalanga',
  'University of Pretoria',
  'University of South Africa',
  'University of the Free State',
  'University of the Western Cape',
  'University of the Witwatersrand',
  'University of Venda',
  'University of Zululand',
  'Vaal University of Technology',
  'Walter Sisulu University',
]

// Common short names and nicknames, used only by the university search
// on the registration flow so typing "Wits" or "UCT" finds the right
// institution. Keyed by the exact name in SOUTH_AFRICAN_UNIVERSITIES;
// matched as a prefix, case-insensitively.
export const UNIVERSITY_ALIASES: Record<string, string[]> = {
  'Cape Peninsula University of Technology': ['CPUT'],
  'Central University of Technology': ['CUT'],
  'Durban University of Technology': ['DUT'],
  'Mangosuthu University of Technology': ['MUT'],
  'Nelson Mandela University': ['NMU'],
  'North-West University': ['NWU', 'North West University'],
  'Sefako Makgatho Health Sciences University': ['SMU'],
  'Sol Plaatje University': ['SPU'],
  'Stellenbosch University': ['SU'],
  'Tshwane University of Technology': ['TUT'],
  'University of Cape Town': ['UCT'],
  'University of Fort Hare': ['UFH'],
  'University of Johannesburg': ['UJ'],
  'University of KwaZulu-Natal': ['UKZN'],
  'University of Mpumalanga': ['UMP'],
  'University of Pretoria': ['UP', 'Tuks'],
  'University of South Africa': ['UNISA'],
  'University of the Free State': ['UFS'],
  'University of the Western Cape': ['UWC'],
  'University of the Witwatersrand': ['Wits'],
  'University of Venda': ['Univen'],
  'University of Zululand': ['Unizulu'],
  'Vaal University of Technology': ['VUT'],
  'Walter Sisulu University': ['WSU'],
}
