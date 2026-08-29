export type NodeType = 'depot' | 'village' | 'shelter' | 'junction';

export interface CriticalSupplyNeed {
  insulin: number;
  blood: number;
  water: number;
  food: number;
  hoursOfStockRemaining: number;
}

export interface Node {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: NodeType;
  criticalSupplyNeed?: CriticalSupplyNeed;
}

export type EdgeStatus = 'clear' | 'degraded' | 'blocked';

export interface Edge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  baseTravelTimeMin: number;
  heavyVehicleSafe: boolean;
  status: EdgeStatus;
  bidirectional: boolean;
}

export interface HazardEvent {
  id: string;
  timestampOffsetSec: number;
  targetEdgeId: string;
  newStatus: Edge['status'];
  description: string;
}

export type CargoType = 'insulin' | 'blood' | 'water' | 'food';

export type ConvoyStatus = 'pending' | 'enroute' | 'rerouted' | 'recalled' | 'arrived';

export interface Convoy {
  id: string;
  cargoType: CargoType;
  originNodeId: string;
  destNodeId: string;
  departTimestampOffsetSec: number;
  status: ConvoyStatus;
  currentRoute: string[];
  currentEdgeId: string | null;
  positionProgress: number;
}

export interface DemoConfig {
  scenarioName: string;
  startTimestamp: number;
  totalDurationSec: number;
}

export interface GraphFixtureData {
  nodes: Node[];
  edges: Edge[];
  hazardEvents: HazardEvent[];
  convoys: Convoy[];
  demoConfig: DemoConfig;
}
