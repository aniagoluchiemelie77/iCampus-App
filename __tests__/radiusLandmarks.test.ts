import {
  describeRadius,
  formatLandmarkKm,
  haversineKm,
  landmarkForRadius,
  nearbyTowns,
  Landmark,
  TownRow,
} from '../src/utils/radiusLandmarks';

// Effurun, Delta State (FUPRE).
const EFFURUN = { lat: 5.556, lng: 5.786 };

describe('haversineKm', () => {
  it('measures roughly 111 km per degree of latitude', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});

describe('nearbyTowns', () => {
  const rows: TownRow[] = [
    ['Warri', 5.5186, 5.748, 1, 250000],
    ['Lagos', 6.4551, 3.3942, 1, 10404112], // ~285 km away
  ];
  it('keeps only towns within reach of the largest stop', () => {
    const result = nearbyTowns(EFFURUN, rows);
    expect(result.map(r => r.name)).toEqual(['Warri']);
    expect(result[0].km).toBeCloseTo(5.9, 0);
    expect(result[0].isCity).toBe(true);
  });

  it('works with the bundled Nigerian dataset', () => {
    const names = nearbyTowns(EFFURUN).map(t => t.name);
    expect(names).toEqual(expect.arrayContaining(['Warri', 'Sapele', 'Benin City']));
    expect(names).not.toContain('Lagos');
  });
});

describe('landmarkForRadius', () => {
  const places: Landmark[] = [
    { name: 'Small Town', km: 9.6, isCity: false, population: 0 },
    { name: 'Warri', km: 8.8, isCity: true, population: 250000 },
    { name: 'Sapele', km: 46, isCity: true, population: 238800 },
    { name: 'Benin City', km: 98, isCity: true, population: 1147188 },
    { name: 'Too Far', km: 140, isCity: true, population: 5000000 },
  ];

  it('prefers a well-known place near the edge of the radius', () => {
    expect(landmarkForRadius(places, 10)?.name).toBe('Warri');
    expect(landmarkForRadius(places, 50)?.name).toBe('Sapele');
    expect(landmarkForRadius(places, 100)?.name).toBe('Benin City');
  });

  it('returns null when nothing sits at about that distance', () => {
    expect(landmarkForRadius(places, 2)).toBeNull();
    expect(landmarkForRadius([], 20)).toBeNull();
  });

  it('gives familiar picks around Effurun from the real data', () => {
    const towns = nearbyTowns(EFFURUN);
    expect(landmarkForRadius(towns, 50)?.name).toBe('Sapele');
    expect(landmarkForRadius(towns, 100)?.name).toBe('Benin City');
  });
});

describe('describeRadius', () => {
  it('describes every stop and Anywhere', () => {
    expect(describeRadius(10).scope).toBe('Across town');
    expect(describeRadius(100).scope).toBe('Your wider region');
    expect(describeRadius(null).scope).toBe('Anywhere');
    // Older listings may hold an in-between value.
    expect(describeRadius(37).scope).toBe('Your city and nearby towns');
  });

  it('uses the campus name for the shortest distances', () => {
    expect(describeRadius(1, 'FUPRE').scope).toBe('Around FUPRE');
    expect(describeRadius(2, 'FUPRE').scope).toBe('FUPRE and nearby hostels');
    expect(describeRadius(1).scope).toBe('Your campus');
    expect(describeRadius(1, '  ').scope).toBe('Your campus');
  });
});

describe('formatLandmarkKm', () => {
  it('uses one decimal below 10 km', () => {
    expect(formatLandmarkKm(2.345)).toBe('2.3 km');
    expect(formatLandmarkKm(46.4)).toBe('46 km');
  });
});
