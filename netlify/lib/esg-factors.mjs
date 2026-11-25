/* GKH Project Champ: the 🌿 ESG emission factor library (searchable by country, kind and source).
   Every value is a published default copied with its source and year; users must check it against the current official release
   before they report. Refresh this file when a source publishes a new edition, and log the change in docs/ESG-REGISTRY.md §6.
   field = the ESG field the factor fills (carbon.fElec …, scope3.fFreight …, carbon.refGwp). */

const R = [];
const add = (cat, field, unit, source, std, year, rows, note) => rows.forEach(([country, region, value, name]) => R.push({ cat, field, unit, country, region: region || '', name: name || '', value, source, std, year, note: note || '' }));

/* ---- ⚡ grid electricity: national and state factors published by the country's own agency (location-based Scope 2) ---- */
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'NGA Factors / NGER Measurement Determination (Clean Energy Regulator)', 'NGA (Australia)', '2025-26', [
  ['Australia', 'New South Wales', 0.64], ['Australia', 'Victoria', 0.78], ['Australia', 'Queensland', 0.67], ['Australia', 'South Australia', 0.22],
  ['Australia', 'Western Australia (SWIS)', 0.50], ['Australia', 'Tasmania', 0.20], ['Australia', 'Northern Territory', 0.56], ['Australia', 'Australian Capital Territory', 0.64]], 'Use the factor for the year being reported');
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'NGA Factors / NGER Measurement Determination (Clean Energy Regulator)', 'NGA (Australia)', '2024-25', [
  ['Australia', 'New South Wales', 0.66], ['Australia', 'Victoria', 0.77], ['Australia', 'Queensland', 0.71], ['Australia', 'South Australia', 0.23],
  ['Australia', 'Western Australia (SWIS)', 0.51], ['Australia', 'Tasmania', 0.15], ['Australia', 'Northern Territory', 0.56], ['Australia', 'Australian Capital Territory', 0.66]]);
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'Grid Emission Factor in Malaysia (Energy Commission / Suruhanjaya Tenaga; Sarawak from SEB)', 'Energy Commission (Malaysia)', '2024 (provisional)', [
  ['Malaysia', 'Peninsular Malaysia', 0.740], ['Malaysia', 'Sabah', 0.539], ['Malaysia', 'Sarawak', 0.199]]);
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'Grid Emission Factor in Malaysia (Energy Commission / Suruhanjaya Tenaga; Sarawak from SEB)', 'Energy Commission (Malaysia)', '2023 (provisional)', [
  ['Malaysia', 'Peninsular Malaysia', 0.760], ['Malaysia', 'Sabah', 0.545], ['Malaysia', 'Sarawak', 0.206]]);
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'UK Government GHG Conversion Factors for Company Reporting (DESNZ)', 'DESNZ (UK)', '2024', [['United Kingdom', '', 0.207]], 'Generation factor; add transmission and distribution losses separately (Scope 3)');
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'Grid emission factor (Energy Market Authority)', 'EMA (Singapore)', 'latest published', [['Singapore', '', 0.412]]);
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'Grid emission factor (Thailand Greenhouse Gas Management Organization)', 'TGO (Thailand)', 'latest published', [['Thailand', '', 0.4999]]);
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'eGRID US average (EPA)', 'EPA (United States)', 'eGRID latest', [['United States', 'US average', 0.373]], 'Use the eGRID subregion for each site where known');
add('Electricity', 'carbon.fElec', 'kgCO2e/kWh', 'Measuring emissions guide (Ministry for the Environment)', 'MfE (New Zealand)', 'latest published', [['New Zealand', '', 0.073]]);

/* ---- 🌍 grid electricity: IEA national averages for 57 countries (CO2 per kWh generated), for countries without a national factor ---- */
add('Electricity', 'carbon.fElec', 'kgCO2/kWh', 'IEA Emission Factors (as published in ABB 2025 electricity emission factors)', 'IEA', '2025', [
  ['Algeria', '', 0.5001], ['Argentina', '', 0.2575], ['Australia', 'National average', 0.5834], ['Austria', '', 0.0999], ['Belgium', '', 0.1414], ['Brazil', '', 0.0658], ['Bulgaria', '', 0.3236], ['Canada', '', 0.119],
  ['Chile', '', 0.221], ['China', '', 0.5892], ['Colombia', '', 0.2104], ['Croatia', '', 0.1483], ['Czech Republic', '', 0.3903], ['Denmark', '', 0.062], ['Egypt', '', 0.4], ['Estonia', '', 0.4539],
  ['Finland', '', 0.0415], ['France', '', 0.0413], ['Germany', '', 0.3313], ['Greece', '', 0.2947], ['Hungary', '', 0.1529], ['India', '', 0.7473], ['Indonesia', '', 0.7528], ['Ireland', '', 0.2413],
  ['Israel', '', 0.3976], ['Italy', '', 0.2574], ['Japan', '', 0.4482], ['Kazakhstan', '', 0.6061], ['South Korea', '', 0.4557], ['Lithuania', '', 0.0679], ['Malaysia', 'National average', 0.6154], ['Mexico', '', 0.4205],
  ['Netherlands', '', 0.2333], ['New Zealand', '', 0.0899], ['Nigeria', '', 0.4035], ['Norway', '', 0.0055], ['Peru', '', 0.2213], ['Philippines', '', 0.7702], ['Poland', '', 0.5438], ['Puerto Rico', '', 0.6086],
  ['Qatar', '', 0.4606], ['Romania', '', 0.2253], ['Saudi Arabia', '', 0.5967], ['Serbia', '', 0.6693], ['Singapore', '', 0.3776], ['Slovakia', '', 0.0972], ['South Africa', '', 0.8726], ['Spain', '', 0.1327],
  ['Sweden', '', 0.0099], ['Switzerland', '', 0.0213], ['Taiwan', '', 0.5541], ['Thailand', '', 0.4324], ['Turkiye', '', 0.4142], ['United Arab Emirates', '', 0.3582], ['United Kingdom', '', 0.175], ['United States', '', 0.3308], ['Vietnam', '', 0.5584]],
  'CO2 only, per kWh generated: prefer the national agency factor where there is one');

/* ---- ⛽ fuels (Scope 1) by publisher ---- */
const FUEL = [['carbon.fDiesel', 'Diesel', 'kgCO2e/L'], ['carbon.fPetrol', 'Petrol (gasoline)', 'kgCO2e/L'], ['carbon.fJet', 'Jet fuel (kerosene)', 'kgCO2e/L'], ['carbon.fLpg', 'LPG', 'kgCO2e/L'], ['carbon.fGas', 'Natural gas', 'kgCO2e/GJ']];
const fuels = (country, source, std, year, v, note) => FUEL.forEach(([field, name, unit], i) => { if (v[i] != null) R.push({ cat: 'Fuel', field, unit, country, region: '', name, value: v[i], source, std, year, note: note || '' }); });
fuels('Australia', 'National Greenhouse Accounts Factors (DCCEEW)', 'NGA (Australia)', 'latest published', [2.71, 2.33, 2.56, 1.56, 51.53], 'Transport and stationary factors differ slightly: check the table for your use');
fuels('United Kingdom', 'UK Government GHG Conversion Factors (DESNZ)', 'DESNZ (UK)', '2024', [2.51, 2.08, 2.54, 1.56, 50.8], 'Forecourt diesel and petrol include the average biofuel blend');
fuels('United States', 'GHG Emission Factors Hub (EPA)', 'EPA (United States)', 'latest published', [2.70, 2.32, 2.58, 1.51, 50.3]);
fuels('New Zealand', 'Measuring emissions guide (Ministry for the Environment)', 'MfE (New Zealand)', 'latest published', [2.68, 2.33, 2.53, 1.60, 54.0]);
fuels('Thailand', 'Emission factors (TGO)', 'TGO (Thailand)', 'latest published', [2.71, 2.24, 2.53, 1.68, 56.1]);
fuels('Global', '2006 IPCC Guidelines, default combustion factors', 'IPCC', '2006', [2.68, 2.31, 2.55, 1.61, 56.1], 'Use where no national factor exists (Malaysia, Singapore, most of Asia, Middle East, Africa)');

/* ---- ❄ refrigerants and other gases: global warming potentials (100-year) ---- */
const GWP = [['R-410A', 2088, 1924, 2256], ['R-134a', 1430, 1300, 1530], ['R-32', 675, 677, 771], ['R-404A', 3922, 3943, 4728], ['R-407C', 1774, 1624, 1908], ['R-22 (HCFC-22)', 1810, 1760, 1960],
  ['R-1234yf', 4, 1, 1], ['R-744 (CO2)', 1, 1, 1], ['SF6 (switchgear)', 22800, 23500, 25200], ['Methane (fossil, with CO2 from oxidation)', 25, 30, 29.8], ['Methane (non-fossil)', 25, 28, 27.0], ['Nitrous oxide', 298, 265, 273]];
GWP.forEach(([gas, ar4, ar5, ar6]) => [['AR4', ar4, 'IPCC Fourth Assessment Report'], ['AR5', ar5, 'IPCC Fifth Assessment Report'], ['AR6', ar6, 'IPCC Sixth Assessment Report']].forEach(([ar, v, src]) =>
  R.push({ cat: 'Refrigerant and gas', field: 'carbon.refGwp', unit: 'kgCO2e/kg (GWP100)', country: 'Global', region: '', name: gas, value: v, source: src, std: 'IPCC ' + ar, year: ar, note: ar === 'AR5' ? 'AR5 is used by NGER, the GHG Protocol and most current reporting' : ar === 'AR6' ? 'IFRS S2 and ESRS point to the latest assessment report' : 'Older inventories only' })));

/* ---- 🔗 Scope 3 indicative defaults (used when you have nothing better) ---- */
[['scope3.fPurch', 'Purchased goods and services (spend-based)', 'tCO2e/k$', 0.35], ['scope3.fFreight', 'Road freight', 'kgCO2e/t-km', 0.11], ['scope3.fLandfill', 'Mixed waste to landfill', 'tCO2e/t', 0.46], ['scope3.fRecycled', 'Waste recycled', 'tCO2e/t', 0.021],
  ['scope3.fAir', 'Flights (average, with uplift)', 'kgCO2e/p-km', 0.15], ['scope3.fCar', 'Average car', 'kgCO2e/km', 0.17], ['scope3.fHotel', 'Hotel night', 'kgCO2e/night', 15], ['scope3.fCommute', 'Commuting (mixed modes)', 'kgCO2e/km', 0.12], ['scope3.fWater', 'Water supplied and treated', 'kgCO2e/m3', 0.34]]
  .forEach(([field, name, unit, value]) => R.push({ cat: 'Scope 3', field, unit, country: 'Global', region: '', name, value, source: 'GKH indicative defaults (rounded from DESNZ, EPA and EEIO averages)', std: 'GKH defaults', year: '2026', note: 'Replace with supplier data or your national set (DESNZ, EPA, NGA) when you can' }));

export const EF_LIBRARY = R.map((x, i) => ({ id: 'EF' + (i + 1), ...x }));
export const EF_INDEX = new Map(EF_LIBRARY.map((x) => [x.id, x]));
