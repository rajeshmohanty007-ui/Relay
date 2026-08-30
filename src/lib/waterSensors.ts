export type WaterLevelStatus = 'normal' | 'advisory' | 'warning' | 'critical';

export type SensorHardwareType =
  | 'ultrasonic_gauge'
  | 'hydrostatic_pressure'
  | 'radar_flow_doppler'
  | 'submersible_logger'
  | 'culvert_inundation_sensor';

export type BasinSection =
  | 'Upper Periyar Catchment'
  | 'North Riverbank Basin'
  | 'Grand Canal Drainage'
  | 'Western Coastal & Culverts'
  | 'Central Floodplain'
  | 'Southern Delta & Estuary';

export interface HistoricalReading {
  timestampSec: number;
  waterLevelM: number;
  flowVelocityMps: number;
  rateOfRiseMPerHour: number;
  status: WaterLevelStatus;
}

export interface WaterSensor {
  id: string;
  name: string;
  code: string;
  basinSection: BasinSection;
  lat: number;
  lng: number;
  elevationM: number;
  hardwareType: SensorHardwareType;
  normalLevelM: number;
  advisoryLevelM: number;
  warningLevelM: number;
  criticalLevelM: number;
  currentLevelM: number;
  baselineLevelM: number;
  rateOfRiseMPerHour: number;
  flowVelocityMps: number;
  dischargeRateCumecs: number;
  roadSubmersionDepthM: number;
  batteryPct: number;
  signalDbm: number;
  status: WaterLevelStatus;
  lastUpdatedIso: string;
  correlatedEdgeIds: string[];
  correlatedNodeNames: string[];
  history: HistoricalReading[];
}

export interface SensorNetworkSummary {
  totalSensors: number;
  normalCount: number;
  advisoryCount: number;
  warningCount: number;
  criticalCount: number;
  averageRiseRateMps: number;
  maxWaterLevelM: number;
  highestRiskSensor: WaterSensor | null;
  activeAlertsCount: number;
  totalSubmergedRoads: number;
}

export type WeatherScenarioId =
  | 'heavy_monsoon'
  | 'dam_spillway_release'
  | 'coastal_tidal_surge'
  | 'flash_flood_pulse'
  | 'clearing_drainage'
  | 'baseline_normal';

export interface WeatherScenario {
  id: WeatherScenarioId;
  name: string;
  description: string;
  surgeMultiplier: number;
  flowMultiplier: number;
  color: string;
}

export const WEATHER_SCENARIOS: Record<WeatherScenarioId, WeatherScenario> = {
  heavy_monsoon: {
    id: 'heavy_monsoon',
    name: 'Heavy Monsoon Storm',
    description: 'Sustained 65mm/hr torrential downpour across upper and central catchments.',
    surgeMultiplier: 1.45,
    flowMultiplier: 1.6,
    color: '#3b82f6',
  },
  dam_spillway_release: {
    id: 'dam_spillway_release',
    name: 'Dam Sluice Spillway Discharge',
    description: 'Upstream reservoir at 98% capacity; 4 spillway gates opened at 850 cumecs.',
    surgeMultiplier: 1.85,
    flowMultiplier: 2.2,
    color: '#ef4444',
  },
  coastal_tidal_surge: {
    id: 'coastal_tidal_surge',
    name: 'High Spring Tide & Coastal Surge',
    description: 'Sea level backing up estuary drainage at Periyar delta outlet.',
    surgeMultiplier: 1.35,
    flowMultiplier: 0.9,
    color: '#8b5cf6',
  },
  flash_flood_pulse: {
    id: 'flash_flood_pulse',
    name: 'Flash Flood Wave Pulse',
    description: 'Sudden cloudburst runoff rushing through mountain tributaries and ravines.',
    surgeMultiplier: 1.7,
    flowMultiplier: 2.0,
    color: '#f59e0b',
  },
  clearing_drainage: {
    id: 'clearing_drainage',
    name: 'Post-Storm Recession & Drainage',
    description: 'Rain halted; high-capacity emergency diesel pumps operating across all culverts.',
    surgeMultiplier: 0.7,
    flowMultiplier: 0.8,
    color: '#10b981',
  },
  baseline_normal: {
    id: 'baseline_normal',
    name: 'Normal Regulated Flow',
    description: 'Stable dry monsoon lull with nominal baseline river and canal depth.',
    surgeMultiplier: 0.5,
    flowMultiplier: 0.6,
    color: '#6b7280',
  },
};

export const INITIAL_WATER_SENSORS: WaterSensor[] = [
  {
    id: 'ws_dam_spillway_01',
    name: 'Periyar Dam Spillway Flume',
    code: 'DAM-UP-01',
    basinSection: 'Upper Periyar Catchment',
    lat: 10.228,
    lng: 76.44,
    elevationM: 84.5,
    hardwareType: 'radar_flow_doppler',
    baselineLevelM: 4.2,
    normalLevelM: 5.5,
    advisoryLevelM: 7.2,
    warningLevelM: 8.8,
    criticalLevelM: 10.5,
    currentLevelM: 8.65,
    rateOfRiseMPerHour: 0.45,
    flowVelocityMps: 4.8,
    dischargeRateCumecs: 780,
    roadSubmersionDepthM: 0.0,
    batteryPct: 98,
    signalDbm: -64,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_dn_jdam', 'edge_jdam_vtea', 'edge_jdam_vhighland'],
    correlatedNodeNames: ['Dam Access Road Junction', 'Tea Foothills Village'],
    history: [],
  },
  {
    id: 'ws_highland_gorge_02',
    name: 'Highland Reach Gorge Torrent',
    code: 'UPP-HG-02',
    basinSection: 'Upper Periyar Catchment',
    lat: 10.238,
    lng: 76.425,
    elevationM: 92.0,
    hardwareType: 'ultrasonic_gauge',
    baselineLevelM: 2.1,
    normalLevelM: 3.2,
    advisoryLevelM: 4.5,
    warningLevelM: 5.8,
    criticalLevelM: 7.0,
    currentLevelM: 4.1,
    rateOfRiseMPerHour: 0.22,
    flowVelocityMps: 3.6,
    dischargeRateCumecs: 310,
    roadSubmersionDepthM: 0.0,
    batteryPct: 91,
    signalDbm: -72,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jdam_vhighland', 'edge_vhighland_jeast'],
    correlatedNodeNames: ['Highland Reach Hamlet', 'East Foothills Bypass Overpass'],
    history: [],
  },
  {
    id: 'ws_tea_hills_creek_03',
    name: 'Tea Foothills Mountain Stream',
    code: 'UPP-TF-03',
    basinSection: 'Upper Periyar Catchment',
    lat: 10.218,
    lng: 76.462,
    elevationM: 78.0,
    hardwareType: 'hydrostatic_pressure',
    baselineLevelM: 1.8,
    normalLevelM: 2.8,
    advisoryLevelM: 4.0,
    warningLevelM: 5.2,
    criticalLevelM: 6.5,
    currentLevelM: 5.65,
    rateOfRiseMPerHour: 0.62,
    flowVelocityMps: 3.9,
    dischargeRateCumecs: 420,
    roadSubmersionDepthM: 0.35,
    batteryPct: 88,
    signalDbm: -78,
    status: 'warning',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jdam_vtea', 'edge_vtea_seast'],
    correlatedNodeNames: ['Tea Foothills Village', 'St. Jude Clinic & Emergency Shelter'],
    history: [],
  },
  {
    id: 'ws_riverbank_north_04',
    name: 'Riverbank North Floodplain Gauge',
    code: 'RNB-NR-04',
    basinSection: 'North Riverbank Basin',
    lat: 10.205,
    lng: 76.392,
    elevationM: 32.5,
    hardwareType: 'ultrasonic_gauge',
    baselineLevelM: 3.5,
    normalLevelM: 5.0,
    advisoryLevelM: 6.8,
    warningLevelM: 8.2,
    criticalLevelM: 9.8,
    currentLevelM: 7.4,
    rateOfRiseMPerHour: 0.38,
    flowVelocityMps: 2.7,
    dischargeRateCumecs: 620,
    roadSubmersionDepthM: 0.15,
    batteryPct: 94,
    signalDbm: -60,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jnf_vriver', 'edge_vriver_jeast'],
    correlatedNodeNames: ['Riverbank North Settlement', 'North Highway Fork'],
    history: [],
  },
  {
    id: 'ws_periyar_bridge_05',
    name: 'Periyar North Causeway Bridge Pier',
    code: 'RNB-BR-05',
    basinSection: 'North Riverbank Basin',
    lat: 10.192,
    lng: 76.365,
    elevationM: 26.0,
    hardwareType: 'radar_flow_doppler',
    baselineLevelM: 4.8,
    normalLevelM: 6.5,
    advisoryLevelM: 8.5,
    warningLevelM: 10.2,
    criticalLevelM: 11.8,
    currentLevelM: 10.85,
    rateOfRiseMPerHour: 0.75,
    flowVelocityMps: 4.4,
    dischargeRateCumecs: 940,
    roadSubmersionDepthM: 0.85,
    batteryPct: 97,
    signalDbm: -56,
    status: 'warning',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jrbn_jcentral', 'edge_jrbn_vpaddy', 'edge_jrbn_jeast'],
    correlatedNodeNames: ['Periyar North Causeway Junction', 'Central District Rotary'],
    history: [],
  },
  {
    id: 'ws_north_fork_06',
    name: 'North Highway Fork Culvert',
    code: 'RNB-NF-06',
    basinSection: 'North Riverbank Basin',
    lat: 10.215,
    lng: 76.37,
    elevationM: 38.0,
    hardwareType: 'culvert_inundation_sensor',
    baselineLevelM: 1.2,
    normalLevelM: 2.2,
    advisoryLevelM: 3.4,
    warningLevelM: 4.6,
    criticalLevelM: 5.8,
    currentLevelM: 2.9,
    rateOfRiseMPerHour: 0.18,
    flowVelocityMps: 1.8,
    dischargeRateCumecs: 180,
    roadSubmersionDepthM: 0.0,
    batteryPct: 90,
    signalDbm: -68,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_dn_jnorth', 'edge_jnf_vriver', 'edge_jnf_jrb_n'],
    correlatedNodeNames: ['North Highway Fork', 'North Ridge Logistics Depot'],
    history: [],
  },
  {
    id: 'ws_paddy_plains_07',
    name: 'Paddy Plains Irrigation Canal',
    code: 'PLN-PP-07',
    basinSection: 'Central Floodplain',
    lat: 10.182,
    lng: 76.338,
    elevationM: 22.0,
    hardwareType: 'submersible_logger',
    baselineLevelM: 1.5,
    normalLevelM: 2.5,
    advisoryLevelM: 3.8,
    warningLevelM: 5.0,
    criticalLevelM: 6.2,
    currentLevelM: 3.95,
    rateOfRiseMPerHour: 0.31,
    flowVelocityMps: 1.4,
    dischargeRateCumecs: 210,
    roadSubmersionDepthM: 0.05,
    batteryPct: 86,
    signalDbm: -70,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jnw_vpaddy', 'edge_jrbn_vpaddy', 'edge_vpaddy_vcoconut', 'edge_vpaddy_jcentral'],
    correlatedNodeNames: ['Paddy Plains Farmland Village', 'Central District Rotary'],
    history: [],
  },
  {
    id: 'ws_central_rotary_08',
    name: 'Central District Rotary Storm Sump',
    code: 'PLN-CR-08',
    basinSection: 'Central Floodplain',
    lat: 10.15,
    lng: 76.36,
    elevationM: 20.5,
    hardwareType: 'hydrostatic_pressure',
    baselineLevelM: 2.0,
    normalLevelM: 3.2,
    advisoryLevelM: 4.6,
    warningLevelM: 6.0,
    criticalLevelM: 7.5,
    currentLevelM: 5.8,
    rateOfRiseMPerHour: 0.44,
    flowVelocityMps: 2.1,
    dischargeRateCumecs: 480,
    roadSubmersionDepthM: 0.25,
    batteryPct: 96,
    signalDbm: -54,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jrbn_jcentral', 'edge_vpaddy_jcentral', 'edge_vcoconut_jcentral', 'edge_jcentral_svalley', 'edge_jcentral_vcanal', 'edge_jcentral_jcanalbridge', 'edge_jcentral_jdelta'],
    correlatedNodeNames: ['Central District Rotary', 'Grand Canal Colony'],
    history: [],
  },
  {
    id: 'ws_east_overpass_09',
    name: 'East Bypass Ravine Weir',
    code: 'PLN-EB-09',
    basinSection: 'Central Floodplain',
    lat: 10.185,
    lng: 76.42,
    elevationM: 44.0,
    hardwareType: 'ultrasonic_gauge',
    baselineLevelM: 2.4,
    normalLevelM: 3.8,
    advisoryLevelM: 5.4,
    warningLevelM: 6.8,
    criticalLevelM: 8.2,
    currentLevelM: 5.1,
    rateOfRiseMPerHour: 0.28,
    flowVelocityMps: 2.5,
    dischargeRateCumecs: 370,
    roadSubmersionDepthM: 0.0,
    batteryPct: 93,
    signalDbm: -63,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_vhighland_jeast', 'edge_vriver_jeast', 'edge_jrbn_jeast', 'edge_jeast_svalley', 'edge_jeast_vweir'],
    correlatedNodeNames: ['East Foothills Bypass Overpass', 'Valley High School Relief Shelter'],
    history: [],
  },
  {
    id: 'ws_old_weir_10',
    name: 'Old Weir Quarters River Barrage',
    code: 'PLN-OW-10',
    basinSection: 'Central Floodplain',
    lat: 10.174,
    lng: 76.448,
    elevationM: 36.0,
    hardwareType: 'radar_flow_doppler',
    baselineLevelM: 3.8,
    normalLevelM: 5.4,
    advisoryLevelM: 7.2,
    warningLevelM: 9.0,
    criticalLevelM: 10.8,
    currentLevelM: 9.35,
    rateOfRiseMPerHour: 0.58,
    flowVelocityMps: 3.8,
    dischargeRateCumecs: 810,
    roadSubmersionDepthM: 0.7,
    batteryPct: 92,
    signalDbm: -67,
    status: 'warning',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jeast_vweir', 'edge_vweir_jvalleylink'],
    correlatedNodeNames: ['Old Weir Quarters', 'Valley Link Roundabout'],
    history: [],
  },
  {
    id: 'ws_grand_canal_11',
    name: 'Grand Canal Colony Embankment',
    code: 'CAN-GC-11',
    basinSection: 'Grand Canal Drainage',
    lat: 10.138,
    lng: 76.342,
    elevationM: 15.0,
    hardwareType: 'hydrostatic_pressure',
    baselineLevelM: 2.2,
    normalLevelM: 3.5,
    advisoryLevelM: 4.8,
    warningLevelM: 6.2,
    criticalLevelM: 7.6,
    currentLevelM: 4.6,
    rateOfRiseMPerHour: 0.35,
    flowVelocityMps: 1.9,
    dischargeRateCumecs: 390,
    roadSubmersionDepthM: 0.1,
    batteryPct: 89,
    signalDbm: -61,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jwest_vcanal', 'edge_jcentral_vcanal', 'edge_vcanal_jdelta'],
    correlatedNodeNames: ['Grand Canal Colony', 'Delta Split Intersection'],
    history: [],
  },
  {
    id: 'ws_canal_sluice_12',
    name: 'Canal Sluice Bridge Cross Gate',
    code: 'CAN-SL-12',
    basinSection: 'Grand Canal Drainage',
    lat: 10.14,
    lng: 76.395,
    elevationM: 18.0,
    hardwareType: 'radar_flow_doppler',
    baselineLevelM: 3.0,
    normalLevelM: 4.5,
    advisoryLevelM: 6.2,
    warningLevelM: 7.8,
    criticalLevelM: 9.4,
    currentLevelM: 8.45,
    rateOfRiseMPerHour: 0.68,
    flowVelocityMps: 3.5,
    dischargeRateCumecs: 720,
    roadSubmersionDepthM: 0.6,
    batteryPct: 95,
    signalDbm: -58,
    status: 'warning',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jcentral_jcanalbridge', 'edge_svalley_jcanalbridge', 'edge_jcanalbridge_vbamboo', 'edge_jcanalbridge_sdelta'],
    correlatedNodeNames: ['Canal Sluice Bridge Cross', 'Delta Sports Complex Central Shelter'],
    history: [],
  },
  {
    id: 'ws_bamboo_creek_13',
    name: 'Bamboo Creek Inundation Gauge',
    code: 'CAN-BC-13',
    basinSection: 'Grand Canal Drainage',
    lat: 10.115,
    lng: 76.425,
    elevationM: 14.5,
    hardwareType: 'ultrasonic_gauge',
    baselineLevelM: 1.6,
    normalLevelM: 2.8,
    advisoryLevelM: 4.0,
    warningLevelM: 5.4,
    criticalLevelM: 6.8,
    currentLevelM: 4.25,
    rateOfRiseMPerHour: 0.4,
    flowVelocityMps: 2.0,
    dischargeRateCumecs: 290,
    roadSubmersionDepthM: 0.15,
    batteryPct: 87,
    signalDbm: -74,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jcanalbridge_vbamboo', 'edge_vbamboo_sdelta'],
    correlatedNodeNames: ['Bamboo Creek Village', 'Delta Sports Complex Central Shelter'],
    history: [],
  },
  {
    id: 'ws_causeway_haven_14',
    name: 'Causeway Haven Tidal Culvert',
    code: 'WST-CH-14',
    basinSection: 'Western Coastal & Culverts',
    lat: 10.162,
    lng: 76.261,
    elevationM: 8.5,
    hardwareType: 'culvert_inundation_sensor',
    baselineLevelM: 2.0,
    normalLevelM: 3.2,
    advisoryLevelM: 4.5,
    warningLevelM: 5.8,
    criticalLevelM: 7.2,
    currentLevelM: 7.65,
    rateOfRiseMPerHour: 0.88,
    flowVelocityMps: 3.2,
    dischargeRateCumecs: 560,
    roadSubmersionDepthM: 1.45,
    batteryPct: 91,
    signalDbm: -65,
    status: 'critical',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jnw_vcauseway', 'edge_vcauseway_swest'],
    correlatedNodeNames: ['Causeway Haven Village', 'West Creek Civic Hall Shelter'],
    history: [],
  },
  {
    id: 'ws_west_culvert_15',
    name: 'West Canal Sluice & Culvert',
    code: 'WST-WC-15',
    basinSection: 'Western Coastal & Culverts',
    lat: 10.132,
    lng: 76.295,
    elevationM: 11.0,
    hardwareType: 'culvert_inundation_sensor',
    baselineLevelM: 1.8,
    normalLevelM: 3.0,
    advisoryLevelM: 4.2,
    warningLevelM: 5.5,
    criticalLevelM: 6.8,
    currentLevelM: 4.9,
    rateOfRiseMPerHour: 0.42,
    flowVelocityMps: 2.2,
    dischargeRateCumecs: 330,
    roadSubmersionDepthM: 0.3,
    batteryPct: 93,
    signalDbm: -62,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_vcoconut_jwest', 'edge_swest_jwest', 'edge_jwest_vmangrove', 'edge_jwest_vcanal'],
    correlatedNodeNames: ['West Canal Culvert Junction', 'Coconut Grove Settlement'],
    history: [],
  },
  {
    id: 'ws_mangrove_edge_16',
    name: 'Mangrove Edge Brackish Tidal Sensor',
    code: 'WST-ME-16',
    basinSection: 'Western Coastal & Culverts',
    lat: 10.108,
    lng: 76.29,
    elevationM: 5.0,
    hardwareType: 'submersible_logger',
    baselineLevelM: 2.5,
    normalLevelM: 3.8,
    advisoryLevelM: 5.0,
    warningLevelM: 6.2,
    criticalLevelM: 7.5,
    currentLevelM: 5.3,
    rateOfRiseMPerHour: 0.36,
    flowVelocityMps: 1.6,
    dischargeRateCumecs: 270,
    roadSubmersionDepthM: 0.4,
    batteryPct: 85,
    signalDbm: -71,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jwest_vmangrove', 'edge_vmangrove_jcoast'],
    correlatedNodeNames: ['Mangrove Edge Fishery Village', 'Coastal Link Junction'],
    history: [],
  },
  {
    id: 'ws_delta_split_17',
    name: 'Delta Split Basin Confluence',
    code: 'DLT-DS-17',
    basinSection: 'Southern Delta & Estuary',
    lat: 10.11,
    lng: 76.345,
    elevationM: 10.0,
    hardwareType: 'radar_flow_doppler',
    baselineLevelM: 2.8,
    normalLevelM: 4.2,
    advisoryLevelM: 5.8,
    warningLevelM: 7.2,
    criticalLevelM: 8.8,
    currentLevelM: 6.4,
    rateOfRiseMPerHour: 0.52,
    flowVelocityMps: 2.8,
    dischargeRateCumecs: 640,
    roadSubmersionDepthM: 0.2,
    batteryPct: 98,
    signalDbm: -55,
    status: 'advisory',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jcentral_jdelta', 'edge_vcanal_jdelta', 'edge_jdelta_sdelta', 'edge_jdelta_jsexpress'],
    correlatedNodeNames: ['Delta Split Intersection', 'Delta Sports Complex Central Shelter'],
    history: [],
  },
  {
    id: 'ws_marshland_bend_18',
    name: 'Marshland Bend Overflow Basin',
    code: 'DLT-MB-18',
    basinSection: 'Southern Delta & Estuary',
    lat: 10.089,
    lng: 76.368,
    elevationM: 6.5,
    hardwareType: 'hydrostatic_pressure',
    baselineLevelM: 2.0,
    normalLevelM: 3.4,
    advisoryLevelM: 4.8,
    warningLevelM: 6.2,
    criticalLevelM: 7.6,
    currentLevelM: 6.75,
    rateOfRiseMPerHour: 0.55,
    flowVelocityMps: 2.4,
    dischargeRateCumecs: 510,
    roadSubmersionDepthM: 0.5,
    batteryPct: 92,
    signalDbm: -66,
    status: 'warning',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jsexpress_vmarshland', 'edge_sdelta_vmarshland', 'edge_dsouth_vmarshland'],
    correlatedNodeNames: ['Marshland Bend Settlement', 'South Base Logistics Hub'],
    history: [],
  },
  {
    id: 'ws_estuary_point_19',
    name: 'Estuary Point Island Outflow Logger',
    code: 'DLT-EP-19',
    basinSection: 'Southern Delta & Estuary',
    lat: 10.092,
    lng: 76.265,
    elevationM: 3.2,
    hardwareType: 'submersible_logger',
    baselineLevelM: 2.2,
    normalLevelM: 3.6,
    advisoryLevelM: 4.8,
    warningLevelM: 6.0,
    criticalLevelM: 7.2,
    currentLevelM: 4.4,
    rateOfRiseMPerHour: 0.25,
    flowVelocityMps: 1.8,
    dischargeRateCumecs: 380,
    roadSubmersionDepthM: 0.1,
    batteryPct: 89,
    signalDbm: -76,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jcoast_vestuary', 'edge_dsouth_vestuary'],
    correlatedNodeNames: ['Estuary Point Island Colony', 'Coastal Link Junction'],
    history: [],
  },
  {
    id: 'ws_south_express_20',
    name: 'South Expressway Low Underpass Sensor',
    code: 'DLT-SE-20',
    basinSection: 'Southern Delta & Estuary',
    lat: 10.098,
    lng: 76.335,
    elevationM: 8.0,
    hardwareType: 'culvert_inundation_sensor',
    baselineLevelM: 1.0,
    normalLevelM: 2.0,
    advisoryLevelM: 3.2,
    warningLevelM: 4.5,
    criticalLevelM: 5.8,
    currentLevelM: 3.1,
    rateOfRiseMPerHour: 0.3,
    flowVelocityMps: 1.7,
    dischargeRateCumecs: 240,
    roadSubmersionDepthM: 0.0,
    batteryPct: 96,
    signalDbm: -59,
    status: 'normal',
    lastUpdatedIso: new Date().toISOString(),
    correlatedEdgeIds: ['edge_jdelta_jsexpress', 'edge_jsexpress_dsouth', 'edge_jsexpress_vmarshland'],
    correlatedNodeNames: ['South Expressway Cloverleaf', 'South Base Logistics Hub'],
    history: [],
  },
];

/**
 * Generate 12 historical points for sparklines
 */
export function generateInitialHistory(sensor: WaterSensor): HistoricalReading[] {
  const points: HistoricalReading[] = [];
  const base = sensor.baselineLevelM;
  const current = sensor.currentLevelM;
  const count = 12;

  for (let i = 0; i < count; i++) {
    const fraction = i / (count - 1);
    // Add natural fluctuation
    const noise = Math.sin(i * 0.8) * 0.25;
    const level = Math.max(0.5, Number((base + (current - base) * fraction + noise).toFixed(2)));

    let status: WaterLevelStatus = 'normal';
    if (level >= sensor.criticalLevelM) status = 'critical';
    else if (level >= sensor.warningLevelM) status = 'warning';
    else if (level >= sensor.advisoryLevelM) status = 'advisory';

    const rateOfRise = Number(((level - base) / (i + 1) * 0.8).toFixed(2));
    const flowVel = Number((sensor.flowVelocityMps * (0.7 + 0.3 * (level / sensor.warningLevelM))).toFixed(2));

    points.push({
      timestampSec: (i - count + 1) * 300, // 5 minute steps backwards
      waterLevelM: level,
      flowVelocityMps: Math.max(0.5, flowVel),
      rateOfRiseMPerHour: rateOfRise,
      status,
    });
  }

  return points;
}

export function initializeSensors(): WaterSensor[] {
  return INITIAL_WATER_SENSORS.map((s) => ({
    ...s,
    history: generateInitialHistory(s),
  }));
}

/**
 * Stepped simulation physics step
 */
export function stepSensorSimulation(
  sensors: WaterSensor[],
  scenarioId: WeatherScenarioId,
  stepSeconds: number = 30
): WaterSensor[] {
  const scenario = WEATHER_SCENARIOS[scenarioId] ?? WEATHER_SCENARIOS.heavy_monsoon;

  return sensors.map((sensor) => {
    // Determine target trend from scenario
    const surgeFactor = scenario.surgeMultiplier;
    const flowFactor = scenario.flowMultiplier;

    // Introduce natural hydrologic stochastic noise
    const stochasticDrift = (Math.random() - 0.48) * 0.08;

    // Upstream dam / mountain sensors rise quicker under flash/dam scenarios
    let zoneBonus = 0;
    if (sensor.basinSection === 'Upper Periyar Catchment' && scenarioId === 'dam_spillway_release') {
      zoneBonus = 0.22;
    } else if (sensor.basinSection === 'Western Coastal & Culverts' && scenarioId === 'coastal_tidal_surge') {
      zoneBonus = 0.25;
    } else if (sensor.basinSection === 'Grand Canal Drainage' && scenarioId === 'heavy_monsoon') {
      zoneBonus = 0.15;
    } else if (scenarioId === 'clearing_drainage') {
      zoneBonus = -0.35;
    }

    const calculatedRateOfRise = Number(
      ((sensor.rateOfRiseMPerHour * 0.85 + (surgeFactor - 1.0) * 0.4 + zoneBonus + stochasticDrift)).toFixed(2)
    );

    // Apply incremental change scaled to step time
    const levelDelta = (calculatedRateOfRise * (stepSeconds / 3600));
    let nextLevel = Math.max(sensor.baselineLevelM * 0.8, sensor.currentLevelM + levelDelta);
    nextLevel = Number(nextLevel.toFixed(2));

    // Calculate status based on thresholds
    let status: WaterLevelStatus = 'normal';
    if (nextLevel >= sensor.criticalLevelM) {
      status = 'critical';
    } else if (nextLevel >= sensor.warningLevelM) {
      status = 'warning';
    } else if (nextLevel >= sensor.advisoryLevelM) {
      status = 'advisory';
    }

    // Road submersion depth
    const submersionDelta = nextLevel - sensor.warningLevelM;
    const roadSubmersionDepthM = submersionDelta > 0 ? Number((submersionDelta * 0.9).toFixed(2)) : 0;

    // Flow velocity scaled with water level
    const nextFlowVelocity = Number(
      Math.max(
        0.5,
        sensor.flowVelocityMps * (0.95 + 0.05 * flowFactor) + (nextLevel - sensor.normalLevelM) * 0.15
      ).toFixed(2)
    );

    // Discharge rate
    const dischargeRateCumecs = Math.round(
      nextLevel * 45 * nextFlowVelocity * (1 + (surgeFactor - 1) * 0.3)
    );

    // Subtle battery and signal fluctuation
    const batteryPct = Math.max(65, Math.min(100, sensor.batteryPct - (Math.random() < 0.05 ? 1 : 0)));
    const signalDbm = Math.min(-45, Math.max(-95, sensor.signalDbm + Math.floor((Math.random() - 0.5) * 3)));

    const newReading: HistoricalReading = {
      timestampSec: Date.now() / 1000,
      waterLevelM: nextLevel,
      flowVelocityMps: nextFlowVelocity,
      rateOfRiseMPerHour: calculatedRateOfRise,
      status,
    };

    const nextHistory = [...sensor.history.slice(-15), newReading];

    return {
      ...sensor,
      currentLevelM: nextLevel,
      rateOfRiseMPerHour: calculatedRateOfRise,
      flowVelocityMps: nextFlowVelocity,
      dischargeRateCumecs,
      roadSubmersionDepthM,
      batteryPct,
      signalDbm,
      status,
      lastUpdatedIso: new Date().toISOString(),
      history: nextHistory,
    };
  });
}

/**
 * Compute aggregate statistics for the entire water sensor network
 */
export function computeSensorSummary(sensors: WaterSensor[]): SensorNetworkSummary {
  let normalCount = 0;
  let advisoryCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let totalRiseRate = 0;
  let maxWaterLevelM = 0;
  let highestRiskSensor: WaterSensor | null = null;
  let maxCriticalRatio = -Infinity;
  let totalSubmergedRoads = 0;

  for (const s of sensors) {
    if (s.status === 'normal') normalCount++;
    else if (s.status === 'advisory') advisoryCount++;
    else if (s.status === 'warning') warningCount++;
    else if (s.status === 'critical') criticalCount++;

    totalRiseRate += s.rateOfRiseMPerHour;
    if (s.currentLevelM > maxWaterLevelM) {
      maxWaterLevelM = s.currentLevelM;
    }

    const ratio = s.currentLevelM / s.criticalLevelM;
    if (ratio > maxCriticalRatio) {
      maxCriticalRatio = ratio;
      highestRiskSensor = s;
    }

    if (s.roadSubmersionDepthM > 0.1) {
      totalSubmergedRoads += s.correlatedEdgeIds.length;
    }
  }

  const averageRiseRateMps = sensors.length > 0 ? Number((totalRiseRate / sensors.length).toFixed(2)) : 0;
  const activeAlertsCount = warningCount + criticalCount;

  return {
    totalSensors: sensors.length,
    normalCount,
    advisoryCount,
    warningCount,
    criticalCount,
    averageRiseRateMps,
    maxWaterLevelM,
    highestRiskSensor,
    activeAlertsCount,
    totalSubmergedRoads,
  };
}
