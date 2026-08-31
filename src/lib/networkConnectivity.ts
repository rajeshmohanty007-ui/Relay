export type NetworkStatus = 'optimal' | 'degraded' | 'critical_drop' | 'blackout';

export type PrimaryChannelType =
  | '5G/LTE Cellular Base Station'
  | 'Satellite Uplink (ISRO GSAT / Starlink)'
  | 'Tactical VHF/UHF Mesh Repeater'
  | 'Microwave Line-of-Sight Relay'
  | 'Emergency LoRaWAN Gateway';

export type TowerPowerSource = 'Grid Utility' | 'Battery Backup' | 'Diesel Genset' | 'Solar Auxiliary' | 'Power Failed';

export interface NetworkPingPoint {
  timestampSec: number;
  latencyMs: number;
  packetLossPct: number;
  bandwidthMbps: number;
  status: NetworkStatus;
}

export interface NetworkNode {
  id: string;
  name: string;
  code: string;
  type: 'depot' | 'shelter' | 'village' | 'junction';
  lat: number;
  lng: number;
  elevationM: number;
  baseLatencyMs?: number;
  primaryChannel: PrimaryChannelType;
  fallbackChannel: PrimaryChannelType;
  activeChannel: PrimaryChannelType;
  status: NetworkStatus;
  latencyMs: number;
  packetLossPct: number;
  bandwidthMbps: number;
  signalDbm: number;
  connectedDevices: number;
  powerSource: TowerPowerSource;
  batteryHoursRemaining: number;
  meshPeers: string[];
  correlatedEdgeIds: string[];
  notes: string;
  history: NetworkPingPoint[];
}

export interface NetworkLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  linkType: 'fiber' | 'microwave' | 'vhf_mesh' | 'satellite';
  bandwidthCapacityMbps: number;
  status: 'active' | 'degraded' | 'severed';
}

export interface NetworkSummary {
  totalNodes: number;
  optimalCount: number;
  degradedCount: number;
  criticalCount: number;
  blackoutCount: number;
  averageLatencyMs: number;
  averagePacketLossPct: number;
  totalConnectedDevices: number;
  towersOnBatteryCount: number;
  blackoutZonesCount: number;
  highestRiskNode: NetworkNode | null;
}

export type NetworkScenarioId =
  | 'monsoon_power_outage'
  | 'fiber_bridge_sever'
  | 'emergency_sat_mesh_deployed'
  | 'heavy_storm_attenuation'
  | 'telecom_cow_restoration'
  | 'nominal_baseline';

export interface NetworkScenario {
  id: NetworkScenarioId;
  name: string;
  description: string;
  latencyFactor: number;
  packetLossBonusPct: number;
  powerStress: boolean;
}



export const INITIAL_NETWORK_NODES: NetworkNode[] = [
  {
    id: 'depot_north',
    name: 'North Ridge Logistics Depot',
    code: 'NET-DN-01',
    type: 'depot',
    lat: 10.224,
    lng: 76.355,
    elevationM: 88,
    primaryChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    status: 'optimal',
    latencyMs: 24,
    packetLossPct: 0.1,
    bandwidthMbps: 220,
    signalDbm: -56,
    connectedDevices: 84,
    powerSource: 'Diesel Genset',
    batteryHoursRemaining: 48,
    meshPeers: ['junc_north_fork', 'junc_northwest_gate', 'junc_dam_road'],
    correlatedEdgeIds: ['edge_dn_jnorth', 'edge_dn_jnw', 'edge_dn_jdam'],
    notes: 'Primary disaster response command hub with redundant satellite array.',
    history: [],
  },
  {
    id: 'depot_south',
    name: 'South Base Logistics Hub',
    code: 'NET-DS-02',
    type: 'depot',
    lat: 10.078,
    lng: 76.312,
    elevationM: 14,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 19,
    packetLossPct: 0.0,
    bandwidthMbps: 310,
    signalDbm: -52,
    connectedDevices: 112,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 36,
    meshPeers: ['junc_south_express', 'junc_coastal_link', 'village_estuary_point'],
    correlatedEdgeIds: ['edge_jsexpress_dsouth', 'edge_jcoast_dsouth', 'edge_dsouth_vestuary', 'edge_dsouth_vmarshland'],
    notes: 'South command station with high-capacity fiber conduit.',
    history: [],
  },
  {
    id: 'shelter_valley_school',
    name: 'Valley High School Relief Shelter',
    code: 'NET-SH-03',
    type: 'shelter',
    lat: 10.165,
    lng: 76.412,
    elevationM: 35,
    primaryChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    status: 'optimal',
    latencyMs: 38,
    packetLossPct: 0.4,
    bandwidthMbps: 140,
    signalDbm: -62,
    connectedDevices: 240,
    powerSource: 'Diesel Genset',
    batteryHoursRemaining: 24,
    meshPeers: ['junc_east_overpass', 'junc_central_cross', 'junc_canal_bridge'],
    correlatedEdgeIds: ['edge_jeast_svalley', 'edge_jcentral_svalley', 'edge_svalley_jcanalbridge'],
    notes: 'Major community relief shelter hosting 1,200 displaced civilians.',
    history: [],
  },
  {
    id: 'shelter_east_hospital',
    name: 'St. Jude Clinic & Emergency Shelter',
    code: 'NET-SH-04',
    type: 'shelter',
    lat: 10.198,
    lng: 76.489,
    elevationM: 62,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 64,
    packetLossPct: 3.2,
    bandwidthMbps: 45,
    signalDbm: -78,
    connectedDevices: 185,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 6.5,
    meshPeers: ['village_tea_foothills', 'junc_valley_link'],
    correlatedEdgeIds: ['edge_vtea_seast', 'edge_jvalleylink_seast'],
    notes: 'Critical triage hospital clinic; grid power flickering.',
    history: [],
  },
  {
    id: 'shelter_delta_stadium',
    name: 'Delta Sports Complex Central Shelter',
    code: 'NET-SH-05',
    type: 'shelter',
    lat: 10.121,
    lng: 76.378,
    elevationM: 18,
    primaryChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    status: 'optimal',
    latencyMs: 32,
    packetLossPct: 0.2,
    bandwidthMbps: 180,
    signalDbm: -58,
    connectedDevices: 410,
    powerSource: 'Diesel Genset',
    batteryHoursRemaining: 30,
    meshPeers: ['junc_canal_bridge', 'junc_delta_split', 'village_marshland_bend'],
    correlatedEdgeIds: ['edge_jcanalbridge_sdelta', 'edge_jdelta_sdelta', 'edge_edge_sdelta_vmarshland', 'edge_vbamboo_sdelta'],
    notes: 'Central refugee dispatch hub with mobile emergency satellite trailer.',
    history: [],
  },
  {
    id: 'shelter_west_hall',
    name: 'West Creek Civic Hall Shelter',
    code: 'NET-SH-06',
    type: 'shelter',
    lat: 10.142,
    lng: 76.275,
    elevationM: 12,
    primaryChannel: 'Tactical VHF/UHF Mesh Repeater',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Tactical VHF/UHF Mesh Repeater',
    status: 'critical_drop',
    latencyMs: 145,
    packetLossPct: 18.5,
    bandwidthMbps: 8,
    signalDbm: -88,
    connectedDevices: 125,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 2.2,
    meshPeers: ['village_causeway_haven', 'junc_west_culvert'],
    correlatedEdgeIds: ['edge_vcauseway_swest', 'edge_swest_jwest'],
    notes: 'Cellular tower submerged; running on emergency VHF packet radio.',
    history: [],
  },
  {
    id: 'village_riverbank',
    name: 'Riverbank North Settlement',
    code: 'NET-VL-07',
    type: 'village',
    lat: 10.205,
    lng: 76.392,
    elevationM: 28,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 78,
    packetLossPct: 5.4,
    bandwidthMbps: 35,
    signalDbm: -82,
    connectedDevices: 62,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 4.8,
    meshPeers: ['junc_north_fork', 'junc_east_overpass'],
    correlatedEdgeIds: ['edge_jnf_vriver', 'edge_vriver_jeast'],
    notes: 'Riverbank flood waters encroaching tower ground station.',
    history: [],
  },
  {
    id: 'village_paddy_plains',
    name: 'Paddy Plains Farmland Village',
    code: 'NET-VL-08',
    type: 'village',
    lat: 10.182,
    lng: 76.338,
    elevationM: 21,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 28,
    packetLossPct: 0.5,
    bandwidthMbps: 95,
    signalDbm: -66,
    connectedDevices: 48,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 18,
    meshPeers: ['junc_northwest_gate', 'junc_river_bridge_n', 'village_coconut_grove', 'junc_central_cross'],
    correlatedEdgeIds: ['edge_jnw_vpaddy', 'edge_jrbn_vpaddy', 'edge_vpaddy_vcoconut', 'edge_vpaddy_jcentral'],
    notes: 'Agricultural plains relay tower with stable line-of-sight.',
    history: [],
  },
  {
    id: 'village_coconut_grove',
    name: 'Coconut Grove Settlement',
    code: 'NET-VL-09',
    type: 'village',
    lat: 10.155,
    lng: 76.315,
    elevationM: 16,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 31,
    packetLossPct: 0.8,
    bandwidthMbps: 88,
    signalDbm: -68,
    connectedDevices: 54,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 14,
    meshPeers: ['village_paddy_plains', 'junc_west_culvert', 'junc_central_cross'],
    correlatedEdgeIds: ['edge_vpaddy_vcoconut', 'edge_vcoconut_jwest', 'edge_vcoconut_jcentral'],
    notes: 'Microcell tower mounted on high palm ridge.',
    history: [],
  },
  {
    id: 'village_mangrove_edge',
    name: 'Mangrove Edge Fishery Village',
    code: 'NET-VL-10',
    type: 'village',
    lat: 10.108,
    lng: 76.29,
    elevationM: 6,
    primaryChannel: 'Tactical VHF/UHF Mesh Repeater',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Tactical VHF/UHF Mesh Repeater',
    status: 'critical_drop',
    latencyMs: 165,
    packetLossPct: 22.0,
    bandwidthMbps: 4,
    signalDbm: -92,
    connectedDevices: 38,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 1.8,
    meshPeers: ['junc_west_culvert', 'junc_coastal_link'],
    correlatedEdgeIds: ['edge_jwest_vmangrove', 'edge_vmangrove_jcoast'],
    notes: 'High tidal surge flooded generator pad; VHF repeater battery critical.',
    history: [],
  },
  {
    id: 'village_highland_reach',
    name: 'Highland Reach Hamlet',
    code: 'NET-VL-11',
    type: 'village',
    lat: 10.238,
    lng: 76.425,
    elevationM: 96,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 22,
    packetLossPct: 0.1,
    bandwidthMbps: 160,
    signalDbm: -54,
    connectedDevices: 29,
    powerSource: 'Solar Auxiliary',
    batteryHoursRemaining: 36,
    meshPeers: ['junc_dam_road', 'junc_east_overpass'],
    correlatedEdgeIds: ['edge_jdam_vhighland', 'edge_vhighland_jeast'],
    notes: 'High altitude mountain relay tower overlooking northern valley.',
    history: [],
  },
  {
    id: 'village_estuary_point',
    name: 'Estuary Point Island Colony',
    code: 'NET-VL-12',
    type: 'village',
    lat: 10.092,
    lng: 76.265,
    elevationM: 4,
    primaryChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    status: 'degraded',
    latencyMs: 82,
    packetLossPct: 6.8,
    bandwidthMbps: 25,
    signalDbm: -76,
    connectedDevices: 44,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 5.5,
    meshPeers: ['junc_coastal_link', 'depot_south'],
    correlatedEdgeIds: ['edge_jcoast_vestuary', 'edge_dsouth_vestuary'],
    notes: 'Island isolated by high water; satellite dish is sole lifeline.',
    history: [],
  },
  {
    id: 'village_tea_foothills',
    name: 'Tea Foothills Village',
    code: 'NET-VL-13',
    type: 'village',
    lat: 10.218,
    lng: 76.462,
    elevationM: 74,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 25,
    packetLossPct: 0.3,
    bandwidthMbps: 110,
    signalDbm: -60,
    connectedDevices: 36,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 22,
    meshPeers: ['junc_dam_road', 'shelter_east_hospital'],
    correlatedEdgeIds: ['edge_jdam_vtea', 'edge_vtea_seast'],
    notes: 'Eastern hill slope repeater with direct path to hospital shelter.',
    history: [],
  },
  {
    id: 'village_canal_side',
    name: 'Grand Canal Colony',
    code: 'NET-VL-14',
    type: 'village',
    lat: 10.138,
    lng: 76.342,
    elevationM: 14,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 72,
    packetLossPct: 4.8,
    bandwidthMbps: 42,
    signalDbm: -79,
    connectedDevices: 58,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 3.8,
    meshPeers: ['junc_west_culvert', 'junc_central_cross', 'junc_delta_split'],
    correlatedEdgeIds: ['edge_jwest_vcanal', 'edge_jcentral_vcanal', 'edge_vcanal_jdelta'],
    notes: 'Canal embankment seepage threatening base power supply.',
    history: [],
  },
  {
    id: 'village_weir_quarters',
    name: 'Old Weir Quarters',
    code: 'NET-VL-15',
    type: 'village',
    lat: 10.174,
    lng: 76.448,
    elevationM: 32,
    primaryChannel: 'Tactical VHF/UHF Mesh Repeater',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Tactical VHF/UHF Mesh Repeater',
    status: 'critical_drop',
    latencyMs: 152,
    packetLossPct: 19.8,
    bandwidthMbps: 6,
    signalDbm: -89,
    connectedDevices: 32,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 1.5,
    meshPeers: ['junc_east_overpass', 'junc_valley_link'],
    correlatedEdgeIds: ['edge_jeast_vweir', 'edge_vweir_jvalleylink'],
    notes: 'Weir barrage overtopping; cellular mast disconnected from grid.',
    history: [],
  },
  {
    id: 'village_bamboo_creek',
    name: 'Bamboo Creek Village',
    code: 'NET-VL-16',
    type: 'village',
    lat: 10.115,
    lng: 76.425,
    elevationM: 13,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 34,
    packetLossPct: 0.9,
    bandwidthMbps: 75,
    signalDbm: -70,
    connectedDevices: 41,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 16,
    meshPeers: ['junc_canal_bridge', 'shelter_delta_stadium'],
    correlatedEdgeIds: ['edge_jcanalbridge_vbamboo', 'edge_vbamboo_sdelta'],
    notes: 'Lowland creek tower operating normally on secondary transformer.',
    history: [],
  },
  {
    id: 'village_marshland_bend',
    name: 'Marshland Bend Settlement',
    code: 'NET-VL-17',
    type: 'village',
    lat: 10.089,
    lng: 76.368,
    elevationM: 7,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 84,
    packetLossPct: 6.2,
    bandwidthMbps: 30,
    signalDbm: -84,
    connectedDevices: 35,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 4.2,
    meshPeers: ['junc_south_express', 'shelter_delta_stadium', 'depot_south'],
    correlatedEdgeIds: ['edge_jsexpress_vmarshland', 'edge_sdelta_vmarshland', 'edge_dsouth_vmarshland'],
    notes: 'Wetland expansion creating multipath signal distortion.',
    history: [],
  },
  {
    id: 'village_causeway_haven',
    name: 'Causeway Haven Village',
    code: 'NET-VL-18',
    type: 'village',
    lat: 10.162,
    lng: 76.261,
    elevationM: 8,
    primaryChannel: 'Emergency LoRaWAN Gateway',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: 'Emergency LoRaWAN Gateway',
    status: 'blackout',
    latencyMs: 420,
    packetLossPct: 58.0,
    bandwidthMbps: 0.5,
    signalDbm: -108,
    connectedDevices: 12,
    powerSource: 'Power Failed',
    batteryHoursRemaining: 0.1,
    meshPeers: ['junc_northwest_gate', 'shelter_west_hall'],
    correlatedEdgeIds: ['edge_jnw_vcauseway', 'edge_vcauseway_swest'],
    notes: 'Tower power completely dead; running on handheld solar LoRa beacon.',
    history: [],
  },
  {
    id: 'junc_north_fork',
    name: 'North Highway Fork Relay',
    code: 'NET-JC-19',
    type: 'junction',
    lat: 10.215,
    lng: 76.37,
    elevationM: 37,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: '5G/LTE Cellular Base Station',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 18,
    packetLossPct: 0.0,
    bandwidthMbps: 280,
    signalDbm: -51,
    connectedDevices: 22,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 24,
    meshPeers: ['depot_north', 'village_riverbank', 'junc_river_bridge_n'],
    correlatedEdgeIds: ['edge_dn_jnorth', 'edge_jnf_vriver', 'edge_jnf_jrb_n'],
    notes: 'Major arterial highway microwave repeater tower.',
    history: [],
  },
  {
    id: 'junc_river_bridge_n',
    name: 'Periyar North Causeway Bridge Relay',
    code: 'NET-JC-20',
    type: 'junction',
    lat: 10.192,
    lng: 76.365,
    elevationM: 25,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 68,
    packetLossPct: 4.2,
    bandwidthMbps: 50,
    signalDbm: -77,
    connectedDevices: 45,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 5.0,
    meshPeers: ['junc_north_fork', 'village_paddy_plains', 'junc_central_cross', 'junc_east_overpass'],
    correlatedEdgeIds: ['edge_jnf_jrb_n', 'edge_jrbn_vpaddy', 'edge_jrbn_jcentral', 'edge_jrbn_jeast'],
    notes: 'Bridge abutment cable conduits under tension from flood currents.',
    history: [],
  },
  {
    id: 'junc_central_cross',
    name: 'Central District Rotary Hub',
    code: 'NET-JC-21',
    type: 'junction',
    lat: 10.15,
    lng: 76.36,
    elevationM: 20,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 26,
    packetLossPct: 0.4,
    bandwidthMbps: 190,
    signalDbm: -58,
    connectedDevices: 88,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 20,
    meshPeers: ['junc_river_bridge_n', 'village_paddy_plains', 'village_coconut_grove', 'village_canal_side', 'shelter_valley_school', 'junc_canal_bridge', 'junc_delta_split'],
    correlatedEdgeIds: ['edge_jrbn_jcentral', 'edge_vpaddy_jcentral', 'edge_vcoconut_jcentral', 'edge_jcentral_vcanal', 'edge_jcentral_svalley', 'edge_jcentral_jcanalbridge', 'edge_jcentral_jdelta'],
    notes: 'Central communications crossroads linking East and West sectors.',
    history: [],
  },
  {
    id: 'junc_east_overpass',
    name: 'East Foothills Bypass Overpass',
    code: 'NET-JC-22',
    type: 'junction',
    lat: 10.185,
    lng: 76.42,
    elevationM: 42,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 20,
    packetLossPct: 0.1,
    bandwidthMbps: 210,
    signalDbm: -55,
    connectedDevices: 34,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 28,
    meshPeers: ['village_highland_reach', 'village_riverbank', 'junc_river_bridge_n', 'shelter_valley_school', 'village_weir_quarters'],
    correlatedEdgeIds: ['edge_vhighland_jeast', 'edge_vriver_jeast', 'edge_jrbn_jeast', 'edge_jeast_svalley', 'edge_jeast_vweir'],
    notes: 'High-elevation hilltop tower with 360-degree microwave coverage.',
    history: [],
  },
  {
    id: 'junc_south_express',
    name: 'South Expressway Cloverleaf Node',
    code: 'NET-JC-23',
    type: 'junction',
    lat: 10.098,
    lng: 76.335,
    elevationM: 9,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 22,
    packetLossPct: 0.2,
    bandwidthMbps: 175,
    signalDbm: -59,
    connectedDevices: 52,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 18,
    meshPeers: ['junc_delta_split', 'depot_south', 'village_marshland_bend'],
    correlatedEdgeIds: ['edge_jdelta_jsexpress', 'edge_jsexpress_dsouth', 'edge_jsexpress_vmarshland'],
    notes: 'Southern highway junction node with dedicated fiber feed from South Base.',
    history: [],
  },
  {
    id: 'junc_west_culvert',
    name: 'West Canal Culvert Junction',
    code: 'NET-JC-24',
    type: 'junction',
    lat: 10.132,
    lng: 76.295,
    elevationM: 10,
    primaryChannel: 'Tactical VHF/UHF Mesh Repeater',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Tactical VHF/UHF Mesh Repeater',
    status: 'degraded',
    latencyMs: 94,
    packetLossPct: 8.5,
    bandwidthMbps: 18,
    signalDbm: -83,
    connectedDevices: 28,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 3.5,
    meshPeers: ['village_coconut_grove', 'shelter_west_hall', 'village_mangrove_edge', 'village_canal_side'],
    correlatedEdgeIds: ['edge_vcoconut_jwest', 'edge_swest_jwest', 'edge_jwest_vmangrove', 'edge_jwest_vcanal'],
    notes: 'Culvert drainage overflow submerged utility junction box.',
    history: [],
  },
  {
    id: 'junc_delta_split',
    name: 'Delta Split Intersection Node',
    code: 'NET-JC-25',
    type: 'junction',
    lat: 10.11,
    lng: 76.345,
    elevationM: 11,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 29,
    packetLossPct: 0.6,
    bandwidthMbps: 130,
    signalDbm: -63,
    connectedDevices: 49,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 15,
    meshPeers: ['junc_central_cross', 'village_canal_side', 'shelter_delta_stadium', 'junc_south_express'],
    correlatedEdgeIds: ['edge_jcentral_jdelta', 'edge_vcanal_jdelta', 'edge_jdelta_sdelta', 'edge_jdelta_jsexpress'],
    notes: 'Delta gateway tower connecting central basin to southern shelters.',
    history: [],
  },
  {
    id: 'junc_dam_road',
    name: 'Dam Access Road Node',
    code: 'NET-JC-26',
    type: 'junction',
    lat: 10.228,
    lng: 76.44,
    elevationM: 82,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: 'Satellite Uplink (ISRO GSAT / Starlink)',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 21,
    packetLossPct: 0.1,
    bandwidthMbps: 230,
    signalDbm: -53,
    connectedDevices: 31,
    powerSource: 'Solar Auxiliary',
    batteryHoursRemaining: 40,
    meshPeers: ['depot_north', 'village_highland_reach', 'village_tea_foothills'],
    correlatedEdgeIds: ['edge_dn_jdam', 'edge_jdam_vhighland', 'edge_jdam_vtea'],
    notes: 'Critical telemetry link for dam spillway flume sensors.',
    history: [],
  },
  {
    id: 'junc_canal_bridge',
    name: 'Canal Sluice Bridge Cross Relay',
    code: 'NET-JC-27',
    type: 'junction',
    lat: 10.14,
    lng: 76.395,
    elevationM: 17,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Tactical VHF/UHF Mesh Repeater',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'degraded',
    latencyMs: 76,
    packetLossPct: 5.1,
    bandwidthMbps: 38,
    signalDbm: -80,
    connectedDevices: 37,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 4.0,
    meshPeers: ['junc_central_cross', 'shelter_valley_school', 'village_bamboo_creek', 'shelter_delta_stadium'],
    correlatedEdgeIds: ['edge_jcentral_jcanalbridge', 'edge_svalley_jcanalbridge', 'edge_jcanalbridge_vbamboo', 'edge_jcanalbridge_sdelta'],
    notes: 'Sluice gate backwash dampening antenna ground reflection.',
    history: [],
  },
  {
    id: 'junc_coastal_link',
    name: 'Coastal Link Junction Tower',
    code: 'NET-JC-28',
    type: 'junction',
    lat: 10.085,
    lng: 76.28,
    elevationM: 5,
    primaryChannel: 'Tactical VHF/UHF Mesh Repeater',
    fallbackChannel: 'Emergency LoRaWAN Gateway',
    activeChannel: 'Tactical VHF/UHF Mesh Repeater',
    status: 'critical_drop',
    latencyMs: 170,
    packetLossPct: 24.5,
    bandwidthMbps: 5,
    signalDbm: -95,
    connectedDevices: 19,
    powerSource: 'Battery Backup',
    batteryHoursRemaining: 1.2,
    meshPeers: ['village_mangrove_edge', 'village_estuary_point', 'depot_south'],
    correlatedEdgeIds: ['edge_vmangrove_jcoast', 'edge_jcoast_vestuary', 'edge_jcoast_dsouth'],
    notes: 'High tide seawater corroding power connections.',
    history: [],
  },
  {
    id: 'junc_valley_link',
    name: 'Valley Link Roundabout Node',
    code: 'NET-JC-29',
    type: 'junction',
    lat: 10.16,
    lng: 76.47,
    elevationM: 50,
    primaryChannel: '5G/LTE Cellular Base Station',
    fallbackChannel: 'Microwave Line-of-Sight Relay',
    activeChannel: '5G/LTE Cellular Base Station',
    status: 'optimal',
    latencyMs: 30,
    packetLossPct: 0.5,
    bandwidthMbps: 105,
    signalDbm: -65,
    connectedDevices: 27,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 20,
    meshPeers: ['village_weir_quarters', 'shelter_east_hospital'],
    correlatedEdgeIds: ['edge_vweir_jvalleylink', 'edge_jvalleylink_seast'],
    notes: 'Eastern valley gateway with microwave trunk to St. Jude shelter.',
    history: [],
  },
  {
    id: 'junc_northwest_gate',
    name: 'Northwest Toll Plaza Relay',
    code: 'NET-JC-30',
    type: 'junction',
    lat: 10.2,
    lng: 76.29,
    elevationM: 30,
    primaryChannel: 'Microwave Line-of-Sight Relay',
    fallbackChannel: '5G/LTE Cellular Base Station',
    activeChannel: 'Microwave Line-of-Sight Relay',
    status: 'optimal',
    latencyMs: 23,
    packetLossPct: 0.2,
    bandwidthMbps: 165,
    signalDbm: -57,
    connectedDevices: 33,
    powerSource: 'Grid Utility',
    batteryHoursRemaining: 26,
    meshPeers: ['depot_north', 'village_paddy_plains', 'village_causeway_haven'],
    correlatedEdgeIds: ['edge_dn_jnw', 'edge_jnw_vpaddy', 'edge_jnw_vcauseway'],
    notes: 'Northwest ridge tower providing wide-area cellular umbrella.',
    history: [],
  },
];

export const NETWORK_SCENARIOS: Record<NetworkScenarioId, NetworkScenario> = {
  monsoon_power_outage: {
    id: 'monsoon_power_outage',
    name: 'Widespread Grid Substation Flood Outage',
    description: 'Electric grid failure across floodplain. Lowland towers running on 4-hour battery reserves.',
    latencyFactor: 1.3,
    packetLossBonusPct: 12,
    powerStress: true,
  },
  fiber_bridge_sever: {
    id: 'fiber_bridge_sever',
    name: 'Periyar North Bridge Fiber Sever',
    description: 'River flood washed away main optical trunk cable. Routing through high-latency microwave backup.',
    latencyFactor: 1.8,
    packetLossBonusPct: 18,
    powerStress: false,
  },
  emergency_sat_mesh_deployed: {
    id: 'emergency_sat_mesh_deployed',
    name: 'Tactical Satellite & VHF Mesh Deployment',
    description: 'Disaster response teams installed satellite terminals at all 4 relief shelters and depots.',
    latencyFactor: 0.95,
    packetLossBonusPct: -4,
    powerStress: false,
  },
  heavy_storm_attenuation: {
    id: 'heavy_storm_attenuation',
    name: 'Severe Rain Fade & Atmospheric Attenuation',
    description: 'Intense 70mm/hr rain curtains attenuating microwave links and satellite Ku-band signals.',
    latencyFactor: 1.5,
    packetLossBonusPct: 10,
    powerStress: false,
  },
  telecom_cow_restoration: {
    id: 'telecom_cow_restoration',
    name: 'Cell-on-Wheels (COW) & Genset Recovery',
    description: 'Mobile telecom vehicles deployed with diesel generators restoring primary connectivity.',
    latencyFactor: 0.85,
    packetLossBonusPct: -8,
    powerStress: false,
  },
  nominal_baseline: {
    id: 'nominal_baseline',
    name: 'Nominal Clear Weather Baseline',
    description: 'All 30 telecommunication hubs operating on 100% utility power and gigabit fiber backhauls.',
    latencyFactor: 0.75,
    packetLossBonusPct: -15,
    powerStress: false,
  },
};

export function generateInitialNetworkHistory(node: NetworkNode): NetworkPingPoint[] {
  const points: NetworkPingPoint[] = [];
  const baseLatency = node.baseLatencyMs ?? node.latencyMs;
  const count = 12;

  for (let i = 0; i < count; i++) {
    const noise = Math.sin(i * 0.8) * 3 + (Math.random() - 0.5) * 2;
    const latency = Math.max(12, Math.round(baseLatency + noise));
    const packetLoss = Math.max(0, Number((node.packetLossPct + (Math.random() - 0.5) * 0.4).toFixed(1)));
    const bw = Math.max(0.5, Math.round(node.bandwidthMbps + (Math.random() - 0.5) * 8));

    let status: NetworkStatus = 'optimal';
    if (packetLoss > 40 || latency > 350) status = 'blackout';
    else if (packetLoss > 12 || latency > 120) status = 'critical_drop';
    else if (packetLoss > 3 || latency > 55) status = 'degraded';

    points.push({
      timestampSec: (i - count + 1) * 300,
      latencyMs: latency,
      packetLossPct: packetLoss,
      bandwidthMbps: bw,
      status,
    });
  }

  return points;
}

export function initializeNetworkNodes(): NetworkNode[] {
  return INITIAL_NETWORK_NODES.map((n) => ({
    ...n,
    baseLatencyMs: n.baseLatencyMs ?? n.latencyMs,
    history: generateInitialNetworkHistory(n),
  }));
}

export function stepNetworkSimulation(
  nodes: NetworkNode[],
  scenarioId: NetworkScenarioId,
  stepSeconds: number = 30
): NetworkNode[] {
  const scenario = NETWORK_SCENARIOS[scenarioId] ?? NETWORK_SCENARIOS.monsoon_power_outage;

  return nodes.map((node) => {
    const baseLatency = node.baseLatencyMs ?? node.latencyMs;
    let powerSource = node.powerSource;
    let batteryHours = node.batteryHoursRemaining;
    let activeChannel = node.activeChannel;

    // Power / Battery drain
    if (powerSource === 'Battery Backup') {
      batteryHours = Math.max(0, Number((batteryHours - (stepSeconds / 3600) * (scenario.powerStress ? 2.5 : 1.0)).toFixed(2)));
      if (batteryHours === 0) {
        powerSource = 'Power Failed';
      }
    }

    let targetLatency: number;
    let targetLoss: number;
    let targetBw: number = node.bandwidthMbps;

    if (powerSource === 'Power Failed') {
      targetLoss = Math.min(100, Math.max(75, node.packetLossPct + 2.5));
      targetLatency = Math.min(750, Math.max(450, node.latencyMs + 15));
      targetBw = Math.max(0.1, targetBw * 0.8);
      activeChannel = node.fallbackChannel;
    } else if (scenarioId === 'fiber_bridge_sever' && (node.id === 'junc_river_bridge_n' || node.id === 'village_riverbank')) {
      targetLatency = Math.round(210 + (Math.random() - 0.5) * 16);
      targetLoss = Number((24 + (Math.random() - 0.5) * 4).toFixed(1));
      targetBw = 12;
      activeChannel = 'Microwave Line-of-Sight Relay';
    } else if (scenarioId === 'emergency_sat_mesh_deployed' && node.type === 'shelter') {
      targetLatency = Math.round(28 + (Math.random() - 0.5) * 4);
      targetLoss = 0.2;
      targetBw = 220;
      activeChannel = 'Satellite Uplink (ISRO GSAT / Starlink)';
      powerSource = 'Diesel Genset';
      batteryHours = 48;
    } else if (scenarioId === 'telecom_cow_restoration' && (node.status === 'blackout' || node.status === 'critical_drop')) {
      targetLatency = Math.round(32 + (Math.random() - 0.5) * 6);
      targetLoss = 0.5;
      targetBw = 120;
      powerSource = 'Diesel Genset';
      batteryHours = 24;
      activeChannel = '5G/LTE Cellular Base Station';
    } else {
      // REALISTIC ANCHORED PING & JITTER (NON-COMPOUNDING)
      const expectedPing = baseLatency * (scenario.latencyFactor ?? 1.0);
      const jitter = (Math.random() - 0.5) * 6; // Realistic ±3ms jitter
      const microSpike = Math.random() < 0.06 ? (Math.random() * 10 + 4) : 0; // Occasional brief queue bump
      const pingTarget = expectedPing + jitter + microSpike;

      // Exponential moving average towards expected ping (anchored baseline, never infinite compounding!)
      targetLatency = Math.round(node.latencyMs * 0.65 + pingTarget * 0.35);
      targetLatency = Math.max(12, Math.min(800, targetLatency));

      // Realistic packet loss flutter around scenario baseline
      const baseLossTarget = Math.max(0, (scenario.packetLossBonusPct > 0 ? scenario.packetLossBonusPct * 0.25 : 0));
      const lossJitter = (Math.random() - 0.5) * 0.6;
      targetLoss = Math.max(0, Math.min(100, Number((node.packetLossPct * 0.7 + (baseLossTarget + lossJitter) * 0.3).toFixed(1))));
    }

    let status: NetworkStatus = 'optimal';
    if (targetLoss > 40 || targetLatency > 350 || powerSource === 'Power Failed') {
      status = 'blackout';
    } else if (targetLoss > 12 || targetLatency > 120) {
      status = 'critical_drop';
    } else if (targetLoss > 3 || targetLatency > 55) {
      status = 'degraded';
    }

    const newReading: NetworkPingPoint = {
      timestampSec: Date.now() / 1000,
      latencyMs: targetLatency,
      packetLossPct: targetLoss,
      bandwidthMbps: targetBw,
      status,
    };

    const nextHistory = [...node.history.slice(-15), newReading];

    return {
      ...node,
      baseLatencyMs: baseLatency,
      status,
      latencyMs: targetLatency,
      packetLossPct: targetLoss,
      bandwidthMbps: targetBw,
      powerSource,
      batteryHoursRemaining: batteryHours,
      activeChannel,
      history: nextHistory,
    };
  });
}




export function computeNetworkSummary(nodes: NetworkNode[]): NetworkSummary {
  let optimalCount = 0;
  let degradedCount = 0;
  let criticalCount = 0;
  let blackoutCount = 0;
  let totalLatency = 0;
  let totalPacketLoss = 0;
  let totalConnectedDevices = 0;
  let towersOnBatteryCount = 0;
  let highestRiskNode: NetworkNode | null = null;
  let maxRiskScore = -Infinity;

  for (const n of nodes) {
    if (n.status === 'optimal') optimalCount++;
    else if (n.status === 'degraded') degradedCount++;
    else if (n.status === 'critical_drop') criticalCount++;
    else if (n.status === 'blackout') blackoutCount++;

    totalLatency += n.latencyMs;
    totalPacketLoss += n.packetLossPct;
    totalConnectedDevices += n.connectedDevices;

    if (n.powerSource === 'Battery Backup' || n.powerSource === 'Power Failed') {
      towersOnBatteryCount++;
    }

    const riskScore = n.packetLossPct * 2 + n.latencyMs * 0.5 + (n.powerSource === 'Power Failed' ? 100 : 0);
    if (riskScore > maxRiskScore) {
      maxRiskScore = riskScore;
      highestRiskNode = n;
    }
  }

  const averageLatencyMs = nodes.length > 0 ? Math.round(totalLatency / nodes.length) : 0;
  const averagePacketLossPct = nodes.length > 0 ? Number((totalPacketLoss / nodes.length).toFixed(1)) : 0;

  return {
    totalNodes: nodes.length,
    optimalCount,
    degradedCount,
    criticalCount,
    blackoutCount,
    averageLatencyMs,
    averagePacketLossPct,
    totalConnectedDevices,
    towersOnBatteryCount,
    blackoutZonesCount: blackoutCount,
    highestRiskNode,
  };
}
