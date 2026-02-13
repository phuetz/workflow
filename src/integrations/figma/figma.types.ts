/** Figma Types - REST API v1 */

export interface FigmaCredentials {
  accessToken: string;
}

export type FigmaOperation =
  | 'getFile'
  | 'getFileNodes'
  | 'getImages'
  | 'getComments'
  | 'postComment'
  | 'getTeamProjects'
  | 'getProjectFiles'
  | 'getVersions'
  | 'getUser'
  | 'getTeamComponents'
  | 'getTeamStyles';

export interface FigmaResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  editorType: 'figma' | 'figjam';
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  componentSets: Record<string, FigmaComponentSet>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
  mainFileKey?: string;
  branches?: Array<{
    key: string;
    name: string;
    thumbnail_url: string;
    last_modified: string;
  }>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaRectangle;
  absoluteRenderBounds?: FigmaRectangle;
  backgroundColor?: FigmaColor;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  blendMode?: string;
  opacity?: number;
  constraints?: FigmaLayoutConstraint;
  layoutAlign?: string;
  layoutGrow?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  characters?: string;
  style?: FigmaTypeStyle;
}

export interface FigmaRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: string;
}

export interface FigmaEffect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
  blendMode?: string;
}

export interface FigmaLayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface FigmaTypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent: number;
  lineHeightUnit: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  documentationLinks: string[];
}

export interface FigmaComponentSet {
  key: string;
  name: string;
  description: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

export interface FigmaComment {
  id: string;
  client_meta: {
    x?: number;
    y?: number;
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
  message: string;
  user: FigmaUser;
  created_at: string;
  resolved_at?: string;
  reactions?: Array<{
    emoji: string;
    created_at: string;
    user: FigmaUser;
  }>;
  order_id: number;
}

export interface FigmaUser {
  id: string;
  handle: string;
  img_url: string;
  email?: string;
}

export interface FigmaProject {
  id: string;
  name: string;
}

export interface FigmaProjectFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
}

export interface FigmaVersion {
  id: string;
  created_at: string;
  label?: string;
  description?: string;
  user: FigmaUser;
}

export interface FigmaImagesResponse {
  err?: string;
  images: Record<string, string | null>;
  status?: number;
}
