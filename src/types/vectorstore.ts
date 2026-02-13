// Vector Store Types
export interface VectorStoreConfig {
  provider: 'pinecone' | 'weaviate' | 'chroma' | 'milvus' | 'qdrant' | 'faiss' | 'redis' | 'elasticsearch';
  apiKey?: string;
  url?: string;
  environment?: string;
  index?: string;
  collection?: string;
  namespace?: string;
  dimensions?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct' | 'manhattan' | 'hamming' | 'jaccard';
  replicas?: number;
  pods?: number;
  podType?: string;
  shards?: number;
  replicas_per_shard?: number;
  metadata_config?: VectorMetadataConfig;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface VectorMetadataConfig {
  indexed?: string[];
  filterable?: string[];
  searchable?: string[];
  facetable?: string[];
  sortable?: string[];
  storable?: string[];
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  score?: number;
  distance?: number;
  namespace?: string;
  source?: string;
  title?: string;
  url?: string;
  timestamp?: string;
  author?: string;
  category?: string;
  tags?: string[];
  version?: string;
  checksum?: string;
  size?: number;
  language?: string;
  contentType?: string;
  extractedText?: string;
  summary?: string;
  keywords?: string[];
  entities?: VectorEntity[];
  chunks?: VectorChunk[];
}

export interface VectorEntity {
  text: string;
  label: string;
  confidence: number;
  start: number;
  end: number;
  description?: string;
  linkedEntity?: {
    name: string;
    url: string;
    dataSource: string;
  };
}

export interface VectorChunk {
  id: string;
  content: string;
  embedding?: number[];
  startIndex: number;
  endIndex: number;
  metadata: Record<string, unknown>;
  score?: number;
  overlap?: number;
  chunkType?: 'paragraph' | 'sentence' | 'word' | 'token' | 'sliding_window' | 'semantic';
  parentId?: string;
  nextChunkId?: string;
  prevChunkId?: string;
}

export interface VectorQuery {
  vector?: number[];
  text?: string;
  embedding?: number[];
  topK: number;
  filter?: VectorFilter;
  namespace?: string;
  includeMetadata?: boolean;
  includeValues?: boolean;
  includeContent?: boolean;
  threshold?: number;
  alpha?: number; // For hybrid search
  sparseVector?: VectorSparseVector;
  rerank?: boolean;
  rerankModel?: string;
  rerankTopK?: number;
  facets?: string[];
  highlight?: VectorHighlight;
  explain?: boolean;
  timeout?: number;
}

export interface VectorFilter {
  must?: VectorFilterCondition[];
  must_not?: VectorFilterCondition[];
  should?: VectorFilterCondition[];
  minimum_should_match?: number;
  bool?: VectorFilter;
  range?: Record<string, VectorRangeFilter>;
  term?: Record<string, unknown>;
  terms?: Record<string, unknown[]>;
  exists?: { field: string };
  prefix?: Record<string, string>;
  wildcard?: Record<string, string>;
  regexp?: Record<string, string>;
  fuzzy?: Record<string, VectorFuzzyFilter>;
  match?: Record<string, unknown>;
  match_phrase?: Record<string, unknown>;
  match_phrase_prefix?: Record<string, unknown>;
  multi_match?: VectorMultiMatchFilter;
  query_string?: VectorQueryStringFilter;
  simple_query_string?: VectorSimpleQueryStringFilter;
  geo_distance?: VectorGeoDistanceFilter;
  geo_bounding_box?: VectorGeoBoundingBoxFilter;
  geo_polygon?: VectorGeoPolygonFilter;
  nested?: VectorNestedFilter;
  has_parent?: VectorHasParentFilter;
  has_child?: VectorHasChildFilter;
  custom?: Record<string, unknown>;
}

export interface VectorFilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists' | 'not_exists' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'fuzzy' | 'range' | 'geo_distance' | 'geo_bounding_box' | 'geo_polygon';
  value: unknown;
  boost?: number;
  case_insensitive?: boolean;
  analyzer?: string;
  fuzziness?: string | number;
  prefix_length?: number;
  max_expansions?: number;
  transpositions?: boolean;
  distance?: string;
  unit?: string;
  validation_method?: 'ignore_malformed' | 'coerce' | 'strict';
}

export interface VectorRangeFilter {
  gt?: unknown;
  gte?: unknown;
  lt?: unknown;
  lte?: unknown;
  format?: string;
  time_zone?: string;
  boost?: number;
}

export interface VectorFuzzyFilter {
  value: unknown;
  fuzziness?: string | number;
  prefix_length?: number;
  max_expansions?: number;
  transpositions?: boolean;
  boost?: number;
}

export interface VectorMultiMatchFilter {
  query: string;
  fields: string[];
  type?: 'best_fields' | 'most_fields' | 'cross_fields' | 'phrase' | 'phrase_prefix' | 'bool_prefix';
  operator?: 'and' | 'or';
  minimum_should_match?: string | number;
  boost?: number;
  analyzer?: string;
  fuzziness?: string | number;
  prefix_length?: number;
  max_expansions?: number;
  cutoff_frequency?: number;
  tie_breaker?: number;
  lenient?: boolean;
}

export interface VectorQueryStringFilter {
  query: string;
  default_field?: string;
  fields?: string[];
  default_operator?: 'and' | 'or';
  analyzer?: string;
  quote_analyzer?: string;
  allow_leading_wildcard?: boolean;
  enable_position_increments?: boolean;
  fuzzy_max_expansions?: number;
  fuzziness?: string | number;
  fuzzy_prefix_length?: number;
  fuzzy_transpositions?: boolean;
  phrase_slop?: number;
  boost?: number;
  analyze_wildcard?: boolean;
  max_determinized_states?: number;
  minimum_should_match?: string | number;
  lenient?: boolean;
  time_zone?: string;
}

export interface VectorSimpleQueryStringFilter {
  query: string;
  fields?: string[];
  default_operator?: 'and' | 'or';
  analyzer?: string;
  flags?: string;
  fuzzy_max_expansions?: number;
  fuzzy_prefix_length?: number;
  fuzzy_transpositions?: boolean;
  lenient?: boolean;
  minimum_should_match?: string | number;
  quote_field_suffix?: string;
  analyze_wildcard?: boolean;
  auto_generate_synonyms_phrase_query?: boolean;
  boost?: number;
}

export interface VectorGeoDistanceFilter {
  distance: string;
  [field: string]: unknown;
  distance_type?: 'arc' | 'plane';
  validation_method?: 'ignore_malformed' | 'coerce' | 'strict';
  unit?: string;
  boost?: number;
}

export interface VectorGeoBoundingBoxFilter {
  [field: string]: {
    top_left: VectorGeoPoint;
    bottom_right: VectorGeoPoint;
  } | 'ignore_malformed' | 'coerce' | 'strict' | 'indexed' | 'memory' | number | undefined;
  validation_method?: 'ignore_malformed' | 'coerce' | 'strict';
  type?: 'indexed' | 'memory';
  boost?: number;
}

export interface VectorGeoPolygonFilter {
  [field: string]: {
    points: VectorGeoPoint[];
  } | 'ignore_malformed' | 'coerce' | 'strict' | number | undefined;
  validation_method?: 'ignore_malformed' | 'coerce' | 'strict';
  boost?: number;
}

export interface VectorGeoPoint {
  lat: number;
  lon: number;
}

export interface VectorNestedFilter {
  path: string;
  query: VectorFilter;
  score_mode?: 'avg' | 'sum' | 'max' | 'min' | 'none';
  boost?: number;
  ignore_unmapped?: boolean;
  inner_hits?: VectorInnerHits;
}

export interface VectorInnerHits {
  name?: string;
  size?: number;
  from?: number;
  sort?: unknown[];
  _source?: boolean | string | string[];
  highlight?: VectorHighlight;
  explain?: boolean;
  version?: boolean;
  seq_no_primary_term?: boolean;
  fields?: string[];
  docvalue_fields?: string[];
  stored_fields?: string[];
  script_fields?: Record<string, unknown>;
  collapse?: unknown;
}

export interface VectorHasParentFilter {
  parent_type: string;
  query: VectorFilter;
  score?: boolean;
  boost?: number;
  ignore_unmapped?: boolean;
  inner_hits?: VectorInnerHits;
}

export interface VectorHasChildFilter {
  type: string;
  query: VectorFilter;
  score_mode?: 'none' | 'avg' | 'sum' | 'max' | 'min';
  min_children?: number;
  max_children?: number;
  boost?: number;
  ignore_unmapped?: boolean;
  inner_hits?: VectorInnerHits;
}

export interface VectorSparseVector {
  indices: number[];
  values: number[];
}

export interface VectorHighlight {
  fields: Record<string, VectorHighlightField>;
  pre_tags?: string[];
  post_tags?: string[];
  tags_schema?: string;
  require_field_match?: boolean;
  boundary_chars?: string;
  boundary_max_scan?: number;
  boundary_scanner?: 'chars' | 'sentence' | 'word';
  boundary_scanner_locale?: string;
  encoder?: 'default' | 'html';
  fragmenter?: 'simple' | 'span';
  fragment_size?: number;
  fragment_offset?: number;
  number_of_fragments?: number;
  no_match_size?: number;
  order?: 'score' | 'none';
  phrase_limit?: number;
  max_fragment_length?: number;
  max_analyzed_offset?: number;
}

export interface VectorHighlightField {
  fragment_size?: number;
  number_of_fragments?: number;
  fragment_offset?: number;
  no_match_size?: number;
  order?: 'score' | 'none';
  pre_tags?: string[];
  post_tags?: string[];
  require_field_match?: boolean;
  boundary_chars?: string;
  boundary_max_scan?: number;
  boundary_scanner?: 'chars' | 'sentence' | 'word';
  boundary_scanner_locale?: string;
  force_source?: boolean;
  fragmenter?: 'simple' | 'span';
  phrase_limit?: number;
  matched_fields?: string[];
  highlight_query?: VectorFilter;
  max_fragment_length?: number;
  max_analyzed_offset?: number;
}

export interface VectorSearchResult {
  documents: VectorDocument[];
  totalResults: number;
  maxScore?: number;
  executionTime: number;
  searchId: string;
  namespace?: string;
  facets?: Record<string, VectorFacet>;
  aggregations?: Record<string, VectorAggregation>;
  suggestions?: VectorSuggestion[];
  timedOut?: boolean;
  took?: number;
  shards?: VectorShardInfo;
  scrollId?: string;
  pitId?: string;
  searchAfter?: unknown[];
  clusters?: VectorCluster[];
  explain?: VectorExplain;
  profile?: VectorProfile;
  warnings?: string[];
}

export interface VectorFacet {
  buckets: VectorFacetBucket[];
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
}

export interface VectorFacetBucket {
  key: unknown;
  doc_count: number;
  key_as_string?: string;
  from?: number;
  to?: number;
  from_as_string?: string;
  to_as_string?: string;
}

export interface VectorAggregation {
  value?: number;
  value_as_string?: string;
  values?: Record<string, number>;
  buckets?: VectorFacetBucket[];
  doc_count?: number;
  bg_count?: number;
  [key: string]: unknown;
}

export interface VectorSuggestion {
  text: string;
  offset: number;
  length: number;
  options: VectorSuggestionOption[];
}

export interface VectorSuggestionOption {
  text: string;
  score: number;
  freq?: number;
  highlighted?: string;
  collate_match?: boolean;
  contexts?: Record<string, unknown>;
  payload?: unknown;
}

export interface VectorShardInfo {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  failures?: VectorShardFailure[];
}

export interface VectorShardFailure {
  shard: number;
  index: string;
  node: string;
  reason: {
    type: string;
    reason: string;
    caused_by?: VectorShardFailure;
  };
  status: number;
}

export interface VectorCluster {
  id: string;
  center: number[];
  documents: VectorDocument[];
  cohesion: number;
  size: number;
  label?: string;
  description?: string;
  keywords?: string[];
  representatives?: VectorDocument[];
}

export interface VectorExplain {
  value: number;
  description: string;
  details?: VectorExplain[];
}

export interface VectorProfile {
  shards: VectorShardProfile[];
}

export interface VectorShardProfile {
  id: string;
  searches: VectorSearchProfile[];
  aggregations?: VectorAggregationProfile[];
  fetch?: VectorFetchProfile;
}

export interface VectorSearchProfile {
  type: string;
  description: string;
  time_in_nanos: number;
  breakdown: Record<string, number>;
  children?: VectorSearchProfile[];
}

export interface VectorAggregationProfile {
  type: string;
  description: string;
  time_in_nanos: number;
  breakdown: Record<string, number>;
  children?: VectorAggregationProfile[];
}

export interface VectorFetchProfile {
  type: string;
  description: string;
  time_in_nanos: number;
  breakdown: Record<string, number>;
}

export interface VectorIndexStats {
  name: string;
  totalVectors: number;
  dimensions: number;
  indexSize: number;
  memoryUsage: number;
  diskUsage: number;
  lastUpdated: string;
  created: string;
  version: string;
  status: 'active' | 'inactive' | 'indexing' | 'error';
  readyReplicas: number;
  totalReplicas: number;
  shards: VectorShardStats[];
  settings: VectorIndexSettings;
  mappings: VectorIndexMappings;
  aliases: string[];
  health: 'green' | 'yellow' | 'red';
  primarySize: number;
  totalSize: number;
  docsCount: number;
  docsDeleted: number;
  storeSize: number;
  segmentsCount: number;
  segmentsMemory: number;
  fieldDataMemory: number;
  queryCache: VectorCacheStats;
  requestCache: VectorCacheStats;
  refreshTotal: number;
  refreshTime: number;
  flushTotal: number;
  flushTime: number;
  mergeTotal: number;
  mergeTime: number;
  searchQueryTotal: number;
  searchQueryTime: number;
  searchFetchTotal: number;
  searchFetchTime: number;
  indexingIndexTotal: number;
  indexingIndexTime: number;
  indexingDeleteTotal: number;
  indexingDeleteTime: number;
  getTotal: number;
  getTime: number;
  getMissingTotal: number;
  getMissingTime: number;
  getExistsTotal: number;
  getExistsTime: number;
}

export interface VectorShardStats {
  shardId: number;
  isPrimary: boolean;
  state: 'started' | 'initializing' | 'relocating' | 'unassigned';
  node: string;
  docsCount: number;
  docsDeleted: number;
  storeSize: number;
  segmentsCount: number;
  segmentsMemory: number;
  routing: VectorShardRouting;
  commit: VectorShardCommit;
  seqNo: VectorShardSeqNo;
  retentionLeases: VectorRetentionLease[];
  path: {
    dataPath: string;
    statePath: string;
  };
}

export interface VectorShardRouting {
  state: 'started' | 'initializing' | 'relocating' | 'unassigned';
  primary: boolean;
  node: string;
  relocatingNode?: string;
  allocationId: string;
  recoverySource: {
    type: 'empty_store' | 'existing_store' | 'peer' | 'snapshot' | 'local_shards';
  };
  unassignedInfo?: {
    reason: string;
    at: string;
    failedAttempts: number;
    delayed: boolean;
    details?: string;
  };
}

export interface VectorShardCommit {
  id: string;
  generation: number;
  userData: Record<string, string>;
  numDocs: number;
}

export interface VectorShardSeqNo {
  maxSeqNo: number;
  localCheckpoint: number;
  globalCheckpoint: number;
}

export interface VectorRetentionLease {
  id: string;
  retainingSeqNo: number;
  timestamp: number;
  source: string;
}

export interface VectorCacheStats {
  memorySize: number;
  evictions: number;
  hitCount: number;
  missCount: number;
  hitRatio: number;
  missRatio: number;
  cacheSize: number;
  cacheCount: number;
}

export interface VectorIndexSettings {
  numberOfShards: number;
  numberOfReplicas: number;
  refreshInterval: string;
  maxResultWindow: number;
  maxInnerResultWindow: number;
  maxRescoreWindow: number;
  maxDocvalueFieldsSearch: number;
  maxScriptFields: number;
  maxNgramDiff: number;
  maxShingleDiff: number;
  maxRefreshListeners: number;
  analysisMaxTokenCount: number;
  highlightMaxAnalyzedOffset: number;
  maxTermsCount: number;
  maxRegexLength: number;
  queryDefaultField: string[];
  routingAllocationEnable: 'all' | 'primaries' | 'new_primaries' | 'none';
  routingRebalanceEnable: 'all' | 'primaries' | 'replicas' | 'none';
  gcDeletes: string;
  defaultPipeline?: string;
  finalPipeline?: string;
  similarity: Record<string, unknown>;
  mapping: VectorMappingSettings;
  analysis: VectorAnalysisSettings;
  indexingSlowlog: VectorSlowlogSettings;
  searchSlowlog: VectorSlowlogSettings;
  merge: VectorMergeSettings;
  translog: VectorTranslogSettings;
  store: VectorStoreSettings;
  lifecycle: VectorLifecycleSettings;
  blocks: VectorBlockSettings;
}

export interface VectorMappingSettings {
  totalFields: {
    limit: number;
  };
  depth: {
    limit: number;
  };
  nestedFields: {
    limit: number;
  };
  nestedObjects: {
    limit: number;
  };
  fieldNameLength: {
    limit: number;
  };
  dimensionFields: {
    limit: number;
  };
  coerce: boolean;
  ignoreMalformed: boolean;
  dateDetection: boolean;
  dynamicDateFormats: string[];
  dynamicTemplates: unknown[];
  fieldData: boolean;
  fieldDataFrequencyFilter: {
    min: number;
    max: number;
    minSegmentSize: number;
  };
}

export interface VectorAnalysisSettings {
  analyzer: Record<string, VectorAnalyzer>;
  normalizer: Record<string, VectorNormalizer>;
  tokenizer: Record<string, VectorTokenizer>;
  filter: Record<string, VectorTokenFilter>;
  charFilter: Record<string, VectorCharFilter>;
}

export interface VectorAnalyzer {
  type?: string;
  tokenizer: string;
  filter: string[];
  charFilter?: string[];
}

export interface VectorNormalizer {
  type?: string;
  filter: string[];
  charFilter?: string[];
}

export interface VectorTokenizer {
  type: string;
  [key: string]: unknown;
}

export interface VectorTokenFilter {
  type: string;
  [key: string]: unknown;
}

export interface VectorCharFilter {
  type: string;
  [key: string]: unknown;
}

export interface VectorSlowlogSettings {
  threshold: {
    query: {
      warn: string;
      info: string;
      debug: string;
      trace: string;
    };
    fetch: {
      warn: string;
      info: string;
      debug: string;
      trace: string;
    };
  };
  level: 'off' | 'trace' | 'debug' | 'info' | 'warn';
}

export interface VectorMergeSettings {
  scheduler: {
    maxThreadCount: number;
    maxMergeCount: number;
    autoThrottle: boolean;
  };
  policy: {
    type: string;
    expungeDeletesPctAllowed: number;
    floorSegmentMb: number;
    maxMergeAtOnce: number;
    maxMergeAtOnceExplicit: number;
    maxMergedSegmentMb: number;
    segmentsPerTier: number;
    reclaimDeletesWeight: number;
  };
}

export interface VectorTranslogSettings {
  syncInterval: string;
  durability: 'request' | 'async';
  flushThresholdSize: string;
  generation: {
    thresholdSize: string;
    thresholdAge: string;
  };
}

export interface VectorStoreSettings {
  type: string;
  preload: string[];
  allowMmap: boolean;
  [key: string]: unknown;
}

export interface VectorLifecycleSettings {
  name: string;
  rolloverAlias?: string;
  indexingComplete?: boolean;
  originationDate?: string;
  parseOriginationDate?: boolean;
  step?: VectorLifecycleStep;
  phaseDefinition?: VectorLifecyclePhase;
}

export interface VectorLifecycleStep {
  key: string;
  action: string;
  actionTime: string;
  stepTime: string;
  phaseTime: string;
  phase: string;
  stepInfo?: unknown;
}

export interface VectorLifecyclePhase {
  phase: string;
  actions: Record<string, unknown>;
  configurations?: Record<string, unknown>;
}

export interface VectorBlockSettings {
  readOnly: boolean;
  readOnlyAllowDelete: boolean;
  read: boolean;
  write: boolean;
  metadata: boolean;
}

export interface VectorIndexMappings {
  properties: Record<string, VectorFieldMapping>;
  dynamicTemplates?: VectorDynamicTemplate[];
  dateDetection?: boolean;
  numericDetection?: boolean;
  dynamicDateFormats?: string[];
  dynamic?: boolean | 'strict' | 'runtime';
  enabled?: boolean;
  includeInParent?: boolean;
  includeInRoot?: boolean;
  meta?: Record<string, unknown>;
  runtime?: Record<string, VectorRuntimeField>;
  _source?: VectorSourceField;
  _routing?: VectorRoutingField;
  _meta?: Record<string, unknown>;
}

export interface VectorFieldMapping {
  type: 'text' | 'keyword' | 'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'scaled_float' | 'date' | 'date_nanos' | 'boolean' | 'binary' | 'integer_range' | 'float_range' | 'long_range' | 'double_range' | 'date_range' | 'ip_range' | 'object' | 'nested' | 'ip' | 'version' | 'murmur3' | 'token_count' | 'percolator' | 'join' | 'rank_feature' | 'rank_features' | 'geo_point' | 'geo_shape' | 'point' | 'shape' | 'search_as_you_type' | 'alias' | 'flattened' | 'histogram' | 'constant_keyword' | 'wildcard' | 'dense_vector' | 'sparse_vector' | 'completion';
  index?: boolean;
  store?: boolean;
  docValues?: boolean;
  fielddata?: boolean;
  analyzer?: string;
  searchAnalyzer?: string;
  normalizer?: string;
  boost?: number;
  coerce?: boolean;
  copyTo?: string | string[];
  enabled?: boolean;
  format?: string;
  ignoreAbove?: number;
  ignoreMalformed?: boolean;
  includeInAll?: boolean;
  indexOptions?: 'docs' | 'freqs' | 'positions' | 'offsets' | Record<string, unknown>;
  indexPhrases?: boolean;
  indexPrefixes?: VectorIndexPrefixes;
  meta?: Record<string, unknown>;
  norms?: boolean;
  nullValue?: unknown;
  positionIncrementGap?: number;
  properties?: Record<string, VectorFieldMapping>;
  searchQuoteAnalyzer?: string;
  similarity?: string | 'l2_norm' | 'dot_product' | 'cosine';
  termVector?: 'no' | 'yes' | 'with_positions' | 'with_offsets' | 'with_positions_offsets' | 'with_positions_payloads' | 'with_positions_offsets_payloads';
  value?: unknown;
  dimensions?: number;
  indexName?: string;
  path?: string;
  maxInputLength?: number;
  preserveSeparators?: boolean;
  preservePositionIncrements?: boolean;
  contexts?: VectorCompletionContext[];
  relations?: Record<string, string | string[]>;
  eagerGlobalOrdinals?: boolean;
  strategy?: 'recursive' | 'term';
  treeLevels?: string;
  precision?: string;
  distanceErrorPct?: number;
  orientation?: 'right' | 'left' | 'clockwise' | 'counterclockwise' | 'cw' | 'ccw';
  pointsOnly?: boolean;
  ignoreZValue?: boolean;
  locale?: string;
  scalingFactor?: number;
  positiveScoreImpact?: boolean;
  depth?: number;
  dynamic?: boolean | 'strict' | 'runtime';
  includeInParent?: boolean;
  includeInRoot?: boolean;
  onScriptError?: 'fail' | 'continue';
  script?: VectorScript;
  fields?: Record<string, VectorFieldMapping>;
  dims?: number;
  method?: Record<string, unknown>;
  element_type?: 'byte' | 'float';
}

export interface VectorIndexPrefixes {
  minChars: number;
  maxChars: number;
}

export interface VectorCompletionContext {
  name: string;
  type: 'category' | 'geo';
  path?: string;
  precision?: string | number;
  neighbors?: boolean;
}

export interface VectorScript {
  source: string;
  id?: string;
  params?: Record<string, unknown>;
  lang?: string;
  options?: Record<string, unknown>;
}

export interface VectorDynamicTemplate {
  [templateName: string]: {
    match?: string;
    unmatch?: string;
    matchMappingType?: string;
    matchPattern?: 'regex' | 'simple';
    pathMatch?: string;
    pathUnmatch?: string;
    mapping: VectorFieldMapping;
  };
}

export interface VectorRuntimeField {
  type: 'boolean' | 'date' | 'double' | 'geo_point' | 'ip' | 'keyword' | 'long' | 'lookup';
  script?: VectorScript;
  format?: string;
  targetField?: string;
  targetIndex?: string;
  fetchFields?: VectorFetchField[];
}

export interface VectorFetchField {
  field: string;
  format?: string;
}

export interface VectorSourceField {
  enabled?: boolean;
  includes?: string[];
  excludes?: string[];
  compress?: boolean;
  compressThreshold?: string;
}

export interface VectorRoutingField {
  required?: boolean;
  path?: string;
}

export interface VectorBulkOperation {
  operation: 'index' | 'create' | 'update' | 'delete';
  index?: string;
  type?: string;
  id?: string;
  document?: VectorDocument;
  routing?: string;
  parent?: string;
  timeout?: string;
  refresh?: boolean | 'wait_for';
  version?: number;
  versionType?: 'internal' | 'external' | 'external_gte' | 'force';
  retryOnConflict?: number;
  pipeline?: string;
  requireAlias?: boolean;
  ifSeqNo?: number;
  ifPrimaryTerm?: number;
  script?: VectorScript;
  scriptedUpsert?: boolean;
  docAsUpsert?: boolean;
  detectNoop?: boolean;
  upsert?: unknown;
  source?: boolean | string[];
  sourceExcludes?: string[];
  sourceIncludes?: string[];
}

export interface VectorBulkResponse {
  took: number;
  errors: boolean;
  items: VectorBulkItemResponse[];
}

export interface VectorBulkItemResponse {
  index?: VectorIndexResponse;
  create?: VectorIndexResponse;
  update?: VectorUpdateResponse;
  delete?: VectorDeleteResponse;
}

export interface VectorIndexResponse {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: 'created' | 'updated' | 'deleted' | 'not_found' | 'noop';
  _shards: {
    total: number;
    successful: number;
    failed: number;
  };
  _seq_no: number;
  _primary_term: number;
  status: number;
  error?: VectorError;
  _routing?: string;
  forced_refresh?: boolean;
}

export interface VectorUpdateResponse extends VectorIndexResponse {
  get?: {
    _source: unknown;
    _version: number;
    _seq_no: number;
    _primary_term: number;
    found: boolean;
  };
}

export interface VectorDeleteResponse {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: 'deleted' | 'not_found';
  _shards: {
    total: number;
    successful: number;
    failed: number;
  };
  _seq_no: number;
  _primary_term: number;
  status: number;
  error?: VectorError;
  _routing?: string;
  forced_refresh?: boolean;
}

export interface VectorError {
  type: string;
  reason: string;
  caused_by?: VectorError;
  suppressed?: VectorError[];
  stack_trace?: string;
  header?: Record<string, string>;
  root_cause?: VectorError[];
  grouped?: boolean;
  phase?: string;
  resource_type?: string;
  resource_id?: string;
  index?: string;
  shard?: string;
  index_uuid?: string;
  failed_shards?: VectorShardFailure[];
  metadata?: Record<string, unknown>;
}

export interface VectorReindexRequest {
  source: {
    index: string | string[];
    type?: string | string[];
    query?: VectorFilter;
    sort?: unknown[];
    _source?: boolean | string[];
    size?: number;
    slice?: {
      id: number;
      max: number;
    };
    remote?: {
      host: string;
      username?: string;
      password?: string;
      socket_timeout?: string;
      connect_timeout?: string;
      headers?: Record<string, string>;
    };
  };
  dest: {
    index: string;
    type?: string;
    routing?: string;
    op_type?: 'index' | 'create';
    version_type?: 'internal' | 'external' | 'external_gte';
    pipeline?: string;
  };
  script?: VectorScript;
  conflicts?: 'abort' | 'proceed';
  size?: number;
  refresh?: boolean;
  timeout?: string;
  waitForActiveShards?: string | number;
  waitForCompletion?: boolean;
  requestsPerSecond?: number;
  requireAlias?: boolean;
  scroll?: string;
  scrollSize?: number;
  maxDocs?: number;
  slices?: number | 'auto';
}

export interface VectorReindexResponse {
  took: number;
  timedOut: boolean;
  total: number;
  updated: number;
  deleted: number;
  batches: number;
  versionConflicts: number;
  noops: number;
  retries: {
    bulk: number;
    search: number;
  };
  throttledMillis: number;
  requestsPerSecond: number;
  throttledUntilMillis: number;
  failures: VectorError[];
  task?: string;
}

export interface VectorScrollRequest {
  scrollId: string;
  scroll?: string;
  scrollSize?: number;
  restTotalHitsAsInt?: boolean;
}

export interface VectorScrollResponse {
  scrollId: string;
  took: number;
  timedOut: boolean;
  terminatedEarly?: boolean;
  hits: {
    total: {
      value: number;
      relation: 'eq' | 'gte';
    };
    maxScore: number;
    hits: VectorHit[];
  };
  shards: VectorShardInfo;
  suggest?: Record<string, VectorSuggestion[]>;
  aggregations?: Record<string, VectorAggregation>;
  profile?: VectorProfile;
  numReducePhases?: number;
}

export interface VectorHit {
  _index: string;
  _type: string;
  _id: string;
  _score: number;
  _version?: number;
  _seq_no?: number;
  _primary_term?: number;
  _source: unknown;
  _routing?: string;
  _parent?: string;
  _explanation?: VectorExplain;
  fields?: Record<string, unknown>;
  highlight?: Record<string, string[]>;
  innerHits?: Record<string, VectorInnerHitsResult>;
  matchedQueries?: string[];
  sort?: unknown[];
  _shard?: string;
  _node?: string;
  _nested?: VectorNestedIdentity;
}

export interface VectorInnerHitsResult {
  hits: {
    total: {
      value: number;
      relation: 'eq' | 'gte';
    };
    maxScore: number;
    hits: VectorHit[];
  };
}

export interface VectorNestedIdentity {
  field: string;
  offset: number;
  _nested?: VectorNestedIdentity;
}

export interface VectorTemplateConfig {
  name: string;
  indexPatterns: string[];
  template: {
    aliases?: Record<string, VectorAliasConfig>;
    mappings?: VectorIndexMappings;
    settings?: VectorIndexSettings;
  };
  composedOf?: string[];
  priority?: number;
  version?: number;
  _meta?: Record<string, unknown>;
  dataStream?: VectorDataStreamConfig;
}

export interface VectorAliasConfig {
  filter?: VectorFilter;
  indexRouting?: string;
  searchRouting?: string;
  isWriteIndex?: boolean;
  isHidden?: boolean;
}

export interface VectorDataStreamConfig {
  timestampField?: {
    name: string;
  };
  hidden?: boolean;
  allowCustomRouting?: boolean;
}

export interface VectorComponentTemplate {
  name: string;
  template: {
    aliases?: Record<string, VectorAliasConfig>;
    mappings?: VectorIndexMappings;
    settings?: VectorIndexSettings;
  };
  version?: number;
  _meta?: Record<string, unknown>;
}

export interface VectorPipelineConfig {
  id: string;
  description?: string;
  processors: VectorProcessor[];
  onFailure?: VectorProcessor[];
  version?: number;
  _meta?: Record<string, unknown>;
}

export interface VectorProcessor {
  [processorType: string]: VectorProcessorConfig;
}

export interface VectorProcessorConfig {
  field?: string;
  targetField?: string;
  ignoreMissing?: boolean;
  ignoreFailure?: boolean;
  onFailure?: VectorProcessor[];
  if?: string;
  tag?: string;
  description?: string;
  [key: string]: unknown;
}