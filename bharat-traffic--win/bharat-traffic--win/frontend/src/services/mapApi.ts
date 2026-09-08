import axios from 'axios';

export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
  type: string;
  source?: 'nominatim' | 'local';
}

// City-specific area data for local suggestions
const CITY_AREAS: Record<string, Array<{ name: string; lat: number; lng: number; keywords: string[] }>> = {
  'Delhi-NCR': [
    // Delhi
    { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, keywords: ['cp', 'connaught', 'parliament', 'rajiv chowk'] },
    { name: 'Chandni Chowk', lat: 28.6507, lng: 77.2303, keywords: ['chandni', 'old delhi', 'red fort', 'laal quila'] },
    { name: 'AIIMS', lat: 28.5672, lng: 77.2100, keywords: ['aiims', 'hospital', 'ring road', 'south delhi'] },
    { name: 'Rajouri Garden', lat: 28.6492, lng: 77.1221, keywords: ['rajouri', 'west delhi', 'market'] },
    { name: 'Dwarka Sector 21', lat: 28.5522, lng: 77.0584, keywords: ['dwarka', 'sector 21', 'metro'] },
    { name: 'Lajpat Nagar', lat: 28.5700, lng: 77.2430, keywords: ['lajpat', 'market', 'south east delhi'] },
    { name: 'Karol Bagh', lat: 28.6514, lng: 77.1897, keywords: ['karol', 'bagh', 'market', 'ajmal khan'] },
    { name: 'Vasant Kunj', lat: 28.5187, lng: 77.1563, keywords: ['vasant', 'kunj', 'south west delhi'] },
    { name: 'Pitampura', lat: 28.7025, lng: 77.1325, keywords: ['pitampura', 'north delhi', 'tv tower'] },
    { name: 'Saket', lat: 28.5227, lng: 77.2083, keywords: ['saket', 'select city', 'mall'] },
    { name: 'Nehru Place', lat: 28.5491, lng: 77.2530, keywords: ['nehru', 'place', 'it market'] },
    { name: 'Pragati Maidan', lat: 28.6167, lng: 77.2433, keywords: ['pragati', 'maidan', 'exhibition', 'trade fair'] },
    { name: 'India Gate', lat: 28.6129, lng: 77.2295, keywords: ['india', 'gate', 'rajpath', 'kartavya path'] },
    { name: 'Hauz Khas', lat: 28.5494, lng: 77.2001, keywords: ['hauz', 'khas', 'village', 'deer park'] },
    { name: 'ITO', lat: 28.6283, lng: 77.2428, keywords: ['ito', 'traffic', 'signal'] },
    // Noida
    { name: 'Noida Sector 18', lat: 28.5708, lng: 77.3261, keywords: ['noida', 'sector 18', 'atmosphere', 'mall'] },
    { name: 'Noida Sector 62', lat: 28.6269, lng: 77.3688, keywords: ['noida', 'sector 62', 'it park', 'office'] },
    { name: 'Noida Expressway', lat: 28.5244, lng: 77.3860, keywords: ['noida', 'expressway', 'yamuna'] },
    { name: 'Greater Noida', lat: 28.4744, lng: 77.5040, keywords: ['greater noida', 'knowledge park'] },
    { name: 'Noida Sector 16A', lat: 28.5822, lng: 77.3166, keywords: ['noida', 'sector 16', 'film city'] },
    { name: 'Noida Sector 34', lat: 28.5900, lng: 77.3540, keywords: ['noida', 'sector 34'] },
    { name: 'Pari Chowk, Greater Noida', lat: 28.4594, lng: 77.5223, keywords: ['pari', 'chowk', 'greater noida'] },
    // Ghaziabad
    { name: 'Ghaziabad Raj Nagar', lat: 28.6692, lng: 77.4538, keywords: ['ghaziabad', 'raj nagar'] },
    { name: 'Kaushambi', lat: 28.6368, lng: 77.3220, keywords: ['kaushambi', 'ghaziabad', 'metro'] },
    { name: 'Vaishali, Ghaziabad', lat: 28.6507, lng: 77.3450, keywords: ['vaishali', 'ghaziabad', 'metro'] },
    { name: 'Indirapuram, Ghaziabad', lat: 28.6356, lng: 77.3712, keywords: ['indirapuram', 'ghaziabad'] },
    { name: 'Crossings Republik, Ghaziabad', lat: 28.6192, lng: 77.4270, keywords: ['crossings', 'republik', 'ghaziabad'] },
    { name: 'NH-24 Ghaziabad', lat: 28.6750, lng: 77.4100, keywords: ['nh24', 'highway', 'ghaziabad'] },
    // Gurgaon
    { name: 'Gurgaon IFFCO Chowk', lat: 28.4721, lng: 77.0725, keywords: ['gurgaon', 'gurugram', 'iffco', 'chowk'] },
    { name: 'Cyber Hub, Gurgaon', lat: 28.4949, lng: 77.0883, keywords: ['cyber', 'hub', 'gurgaon', 'dlf'] },
    { name: 'MG Road Gurgaon', lat: 28.4802, lng: 77.0798, keywords: ['mg road', 'gurgaon', 'metro'] },
    { name: 'Sohna Road, Gurgaon', lat: 28.4262, lng: 77.0342, keywords: ['sohna', 'road', 'gurgaon'] },
    { name: 'Dwarka Expressway', lat: 28.5300, lng: 77.0400, keywords: ['dwarka', 'expressway', 'gurgaon'] },
    { name: 'Sector 29 Gurgaon', lat: 28.4612, lng: 77.0900, keywords: ['sector 29', 'gurgaon', 'hub'] },
    { name: 'Huda City Centre', lat: 28.4595, lng: 77.0724, keywords: ['huda', 'city centre', 'metro', 'gurgaon'] },
    // Landmarks
    { name: 'DND Flyway', lat: 28.5684, lng: 77.2796, keywords: ['dnd', 'flyway', 'toll', 'noida delhi'] },
    { name: 'Pragati Maidan', lat: 28.6167, lng: 77.2433, keywords: ['pragati', 'maidan'] },
    { name: 'Red Fort', lat: 28.6562, lng: 77.2410, keywords: ['red fort', 'lal quila', 'old delhi'] },
    { name: 'Qutub Minar', lat: 28.5245, lng: 77.1855, keywords: ['qutub', 'minar', 'mehrauli'] },
    { name: 'Humayun Tomb', lat: 28.5933, lng: 77.2507, keywords: ['humayun', 'tomb', 'nizamuddin'] },
    { name: 'Lotus Temple', lat: 28.5535, lng: 77.2588, keywords: ['lotus', 'temple', 'bahai', 'kalkaji'] },
  ],
  'Bengaluru': [
    { name: 'MG Road', lat: 12.9758, lng: 77.6068, keywords: ['mg road', 'trinity circle'] },
    { name: 'Silk Board Junction', lat: 12.9172, lng: 77.6228, keywords: ['silk board', 'orr'] },
    { name: 'HSR Layout', lat: 12.9116, lng: 77.6378, keywords: ['hsr', 'layout', 'bda'] },
    { name: 'Koramangala', lat: 12.9352, lng: 77.6245, keywords: ['koramangala', '5th block'] },
    { name: 'Whitefield', lat: 12.9698, lng: 77.7500, keywords: ['whitefield', 'itpl'] },
    { name: 'Electronic City', lat: 12.8456, lng: 77.6605, keywords: ['electronic city', 'phase 1'] },
    { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, keywords: ['indiranagar', '100ft road'] },
    { name: 'Jayanagar', lat: 12.9295, lng: 77.5848, keywords: ['jayanagar', '4th block'] },
    { name: 'BTM Layout', lat: 12.9165, lng: 77.6103, keywords: ['btm', 'layout'] },
    { name: 'Hebbal Flyover', lat: 13.0359, lng: 77.5970, keywords: ['hebbal', 'flyover', 'airport'] },
    { name: 'Marathahalli', lat: 12.9569, lng: 77.7011, keywords: ['marathahalli', 'bridge'] },
    { name: 'Bellandur', lat: 12.9262, lng: 77.6762, keywords: ['bellandur', 'lake', 'orr'] },
    { name: 'Bannerghatta Road', lat: 12.8898, lng: 77.6005, keywords: ['bannerghatta', 'road'] },
    { name: 'Kempegowda International Airport', lat: 13.1986, lng: 77.7066, keywords: ['airport', 'kia', 'blr'] },
    { name: 'Cubbon Park', lat: 12.9763, lng: 77.5929, keywords: ['cubbon', 'park'] },
  ],
  Mumbai: [
    { name: 'Bandra-Worli Sea Link', lat: 19.0330, lng: 72.8170, keywords: ['bandra', 'worli', 'sea link'] },
    { name: 'BKC', lat: 19.0600, lng: 72.8530, keywords: ['bkc', 'bandra kurla'] },
    { name: 'Marine Drive', lat: 18.9432, lng: 72.8234, keywords: ['marine', 'drive', 'queens necklace'] },
    { name: 'Andheri', lat: 19.1197, lng: 72.8464, keywords: ['andheri', 'west', 'east'] },
    { name: 'Dadar', lat: 19.0178, lng: 72.8478, keywords: ['dadar', 'tt circle'] },
    { name: 'Churchgate', lat: 18.9322, lng: 72.8264, keywords: ['churchgate', 'station'] },
    { name: 'Colaba', lat: 18.9154, lng: 72.8264, keywords: ['colaba', 'gateway of india'] },
    { name: 'Powai', lat: 19.1176, lng: 72.9060, keywords: ['powai', 'lake'] },
    { name: 'Lower Parel', lat: 19.0031, lng: 72.8347, keywords: ['lower parel', 'phoenix'] },
    { name: 'Thane', lat: 19.1969, lng: 72.9639, keywords: ['thane', 'east west'] },
    { name: 'Navi Mumbai', lat: 19.0596, lng: 73.0373, keywords: ['navi mumbai', 'vashi'] },
  ],
  Hyderabad: [
    { name: 'HITECH City', lat: 17.4504, lng: 78.3808, keywords: ['hitech', 'city', 'cyber towers'] },
    { name: 'Gachibowli', lat: 17.4401, lng: 78.3615, keywords: ['gachibowli', 'bio diversity'] },
    { name: 'Secunderabad', lat: 17.4399, lng: 78.4983, keywords: ['secunderabad', 'station'] },
    { name: 'Jubilee Hills', lat: 17.4319, lng: 78.4072, keywords: ['jubilee', 'hills', 'checkpost'] },
    { name: 'Charminar', lat: 17.3616, lng: 78.4747, keywords: ['charminar', 'old city'] },
    { name: 'Banjara Hills', lat: 17.4156, lng: 78.4347, keywords: ['banjara', 'hills'] },
    { name: 'Kondapur', lat: 17.4660, lng: 78.3470, keywords: ['kondapur'] },
    { name: 'Mehdipatnam', lat: 17.3944, lng: 78.4380, keywords: ['mehdipatnam'] },
    { name: 'Shamshabad Airport', lat: 17.2403, lng: 78.4294, keywords: ['airport', 'rgia', 'shamshabad'] },
  ],
};

// Fallback generic suggestions per city (areas, roads, landmarks)
const CITY_SEARCH_SUFFIXES: Record<string, string[]> = {
  'Delhi-NCR': ['Delhi', 'New Delhi', 'Noida', 'Ghaziabad', 'Gurgaon', 'Gurugram'],
  'Bengaluru': ['Bengaluru', 'Bangalore'],
  Mumbai: ['Mumbai', 'Bandra', 'Andheri', 'Thane'],
  Hyderabad: ['Hyderabad', 'Secunderabad', 'HITECH City'],
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface PopularArea {
  name: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
}

const POPULAR_AREAS: Record<string, PopularArea[]> = {
  'Delhi-NCR': [
    { name: 'Connaught Place', description: 'Central Delhi — Shopping & dining hub', category: 'Landmark', lat: 28.6315, lng: 77.2167 },
    { name: 'Chandni Chowk', description: 'Old Delhi — Historic bazaar & food street', category: 'Market', lat: 28.6507, lng: 77.2303 },
    { name: 'AIIMS Flyover', description: 'South Delhi — Major traffic bottleneck', category: 'Junction', lat: 28.5672, lng: 77.2100 },
    { name: 'DND Flyway', description: 'Delhi-Noida toll corridor', category: 'Highway', lat: 28.5684, lng: 77.2796 },
    { name: 'Rajouri Garden', description: 'West Delhi — Market & metro hub', category: 'Market', lat: 28.6492, lng: 77.1221 },
    { name: 'Noida Sector 18', description: 'Noida — Atta Market & malls', category: 'Market', lat: 28.5708, lng: 77.3261 },
    { name: 'Ghaziabad Raj Nagar', description: 'Ghaziabad — Residential hub', category: 'Area', lat: 28.6692, lng: 77.4538 },
    { name: 'Dwarka Expressway', description: 'Major corridor — Gurgaon to Dwarka', category: 'Highway', lat: 28.5300, lng: 77.0400 },
    { name: 'India Gate', description: 'Central Delhi — War memorial & tourist spot', category: 'Landmark', lat: 28.6129, lng: 77.2295 },
    { name: 'Qutub Minar', description: 'South Delhi — UNESCO heritage site', category: 'Landmark', lat: 28.5245, lng: 77.1855 },
    { name: 'Cyber Hub, Gurgaon', description: 'Gurgaon — IT & dining district', category: 'IT Hub', lat: 28.4949, lng: 77.0883 },
    { name: 'Noida Expressway', description: 'Delhi-Noida express corridor', category: 'Highway', lat: 28.5244, lng: 77.3860 },
  ],
  'Bengaluru': [
    { name: 'MG Road', description: 'Central Bengaluru — Shopping & nightlife', category: 'Market', lat: 12.9758, lng: 77.6068 },
    { name: 'Silk Board Junction', description: 'ORR — Worst traffic jam spot', category: 'Junction', lat: 12.9172, lng: 77.6228 },
    { name: 'HSR Layout', description: 'South Bengaluru — Startup hub', category: 'Area', lat: 12.9116, lng: 77.6378 },
    { name: 'Whitefield', description: 'East Bengaluru — IT corridor', category: 'IT Hub', lat: 12.9698, lng: 77.7500 },
    { name: 'Electronic City', description: 'South Bengaluru — Tech park zone', category: 'IT Hub', lat: 12.8456, lng: 77.6605 },
    { name: 'Hebbal Flyover', description: 'North Bengaluru — Airport access', category: 'Junction', lat: 13.0359, lng: 77.5970 },
    { name: 'Marathahalli Bridge', description: 'East Bengaluru — ORR crossing', category: 'Junction', lat: 12.9569, lng: 77.7011 },
    { name: 'Cubbon Park', description: 'Central Bengaluru — Heritage park', category: 'Landmark', lat: 12.9763, lng: 77.5929 },
  ],
  Mumbai: [
    { name: 'Bandra-Worli Sea Link', description: 'Iconic cable-stayed bridge', category: 'Highway', lat: 19.0330, lng: 72.8170 },
    { name: 'BKC', description: 'Business district & exhibition center', category: 'IT Hub', lat: 19.0600, lng: 72.8530 },
    { name: 'Marine Drive', description: 'Queen\'s Necklace — Coastal promenade', category: 'Landmark', lat: 18.9432, lng: 72.8234 },
    { name: 'Andheri', description: 'Suburban hub — East & West', category: 'Area', lat: 19.1197, lng: 72.8464 },
    { name: 'Dadar TT Circle', description: 'Major traffic junction', category: 'Junction', lat: 19.0178, lng: 72.8478 },
    { name: 'Lower Parel', description: 'Mall district & corporate offices', category: 'Market', lat: 19.0031, lng: 72.8347 },
  ],
  Hyderabad: [
    { name: 'HITECH City', description: 'IT corridor — Cyber Towers area', category: 'IT Hub', lat: 17.4504, lng: 78.3808 },
    { name: 'Gachibowli', description: 'Financial district & IT parks', category: 'IT Hub', lat: 17.4401, lng: 78.3615 },
    { name: 'Charminar', description: 'Old City — Historic monument', category: 'Landmark', lat: 17.3616, lng: 78.4747 },
    { name: 'Secunderabad Station', description: 'Railway junction', category: 'Junction', lat: 17.4399, lng: 78.4983 },
    { name: 'Jubilee Hills', description: 'Upscale residential & dining', category: 'Area', lat: 17.4319, lng: 78.4072 },
    { name: 'Shamshabad Airport', description: 'Rajiv Gandhi International Airport', category: 'Landmark', lat: 17.2403, lng: 78.4294 },
  ],
};

export const mapSearchService = {
  getPopularAreas: (city: string): PopularArea[] => {
    return POPULAR_AREAS[city] || [];
  },

  searchLocations: async (query: string, city: string = 'Bengaluru'): Promise<SearchResult[]> => {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase().trim();
    const cityAreas = CITY_AREAS[city] || [];

    // 1. Local area matches (instant, no network)
    const localMatches: SearchResult[] = cityAreas
      .filter((area) => {
        const nameMatch = area.name.toLowerCase().includes(lowerQuery);
        const keywordMatch = area.keywords.some((kw) => lowerQuery.includes(kw) || kw.includes(lowerQuery));
        return nameMatch || keywordMatch;
      })
      .slice(0, 5)
      .map((area, i) => ({
        place_id: -1000 - i,
        display_name: `${area.name}, ${city}, India`,
        lat: String(area.lat),
        lon: String(area.lng),
        type: 'local_area',
        source: 'local' as const,
      }));

    // 2. Nominatim search (network)
    try {
      // Build search query with city context
      let searchQuery = query;
      const suffixes = CITY_SEARCH_SUFFIXES[city] || [city, 'India'];
      const hasCityInQuery = suffixes.some((s) => lowerQuery.includes(s.toLowerCase()));
      if (!hasCityInQuery) {
        searchQuery = `${query}, ${suffixes[0]}, India`;
      }

      const response = await axios.get<SearchResult[]>(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: searchQuery,
          format: 'json',
          addressdetails: 1,
          limit: 8,
          countrycodes: 'in',
          viewbox: getViewboxForCity(city),
          bounded: 1,
        },
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'BharatTrafficTwin/1.0',
        },
      });

      const remoteResults: SearchResult[] = response.data.map((r) => ({ ...r, source: 'nominatim' as const }));

      // Merge: local results first, then remote, deduplicate by proximity
      const merged = [...localMatches, ...remoteResults];
      return merged.slice(0, 8);
    } catch {
      // If Nominatim fails, return local matches only
      return localMatches;
    }
  },
};

/** Viewbox [west, south, east, north] for bounding Nominatim to the selected metro */
function getViewboxForCity(city: string): string {
  switch (city) {
    case 'Delhi-NCR':
      return '76.85,28.40,77.55,28.90';
    case 'Bengaluru':
      return '77.40,12.80,77.85,13.10';
    case 'Mumbai':
      return '72.75,18.85,73.10,19.20';
    case 'Hyderabad':
      return '78.25,17.20,78.65,17.60';
    default:
      return '';
  }
}
