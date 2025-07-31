// Collaboration and real-time features interfaces
export interface CollaborationSession {
  projectId: string;
  participants: Participant[];
  changes: Change[];
  comments: Comment[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt: Date;
  lastSeen: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}

export interface Change {
  id: string;
  type: ChangeType;
  participantId: string;
  timestamp: Date;
  data: ChangeData;
  applied: boolean;
  conflictsWith?: string[];
}

export interface ChangeData {
  path: string; // JSON path to the changed property
  oldValue: any;
  newValue: any;
  operation: ChangeOperation;
}

export interface Comment {
  id: string;
  participantId: string;
  content: string;
  elementId?: string; // ID of the element being commented on
  position?: CommentPosition;
  timestamp: Date;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  participantId: string;
  content: string;
  timestamp: Date;
}

export interface CommentPosition {
  x: number;
  y: number;
  elementSelector?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

export interface SelectionRange {
  startElementId: string;
  endElementId: string;
  startOffset: number;
  endOffset: number;
}

// Conflict resolution interfaces
export interface ConflictResolution {
  conflictId: string;
  resolution: ResolutionStrategy;
  resolvedBy: string;
  resolvedAt: Date;
  mergedValue?: any;
}

export interface ConflictInfo {
  id: string;
  changes: Change[];
  affectedPath: string;
  participants: string[];
  severity: ConflictSeverity;
  autoResolvable: boolean;
}

// WebRTC and connection interfaces
export interface ConnectionInfo {
  participantId: string;
  peerId: string;
  connectionState: ConnectionState;
  dataChannel?: RTCDataChannel;
  lastPing: Date;
  latency: number;
}

export interface SyncMessage {
  type: MessageType;
  senderId: string;
  timestamp: Date;
  data: any;
  messageId: string;
  requiresAck: boolean;
}

// Enums
export enum ParticipantRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  COMMENTER = 'commenter',
  VIEWER = 'viewer'
}

export enum ParticipantStatus {
  ONLINE = 'online',
  AWAY = 'away',
  OFFLINE = 'offline'
}

export enum ChangeType {
  CONTENT_UPDATE = 'content_update',
  STYLE_UPDATE = 'style_update',
  SECTION_ADD = 'section_add',
  SECTION_REMOVE = 'section_remove',
  SECTION_REORDER = 'section_reorder',
  PROJECT_SETTINGS = 'project_settings'
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move'
}

export enum ResolutionStrategy {
  ACCEPT_MINE = 'accept_mine',
  ACCEPT_THEIRS = 'accept_theirs',
  MERGE = 'merge',
  MANUAL = 'manual'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  RECONNECTING = 'reconnecting'
}

export enum MessageType {
  CHANGE = 'change',
  CURSOR_UPDATE = 'cursor_update',
  SELECTION_UPDATE = 'selection_update',
  COMMENT = 'comment',
  PARTICIPANT_JOIN = 'participant_join',
  PARTICIPANT_LEAVE = 'participant_leave',
  PING = 'ping',
  PONG = 'pong',
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response'
}