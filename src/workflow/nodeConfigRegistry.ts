import React from 'react';
import HttpRequestConfig from './nodes/config/HttpRequestConfig';
import EmailConfig from './nodes/config/EmailConfig';
import SlackConfig from './nodes/config/SlackConfig';
import ScheduleConfig from './nodes/config/ScheduleConfig';
import DelayConfig from './nodes/config/DelayConfig';
import SubWorkflowConfig from './nodes/config/SubWorkflowConfig';
import ApprovalConfig from './nodes/config/ApprovalConfig';
import DefaultConfig from './nodes/config/DefaultConfig';
import HasuraConfig from './nodes/config/HasuraConfig';
import StrapiConfig from './nodes/config/StrapiConfig';
import ReplicateConfig from './nodes/config/ReplicateConfig';

// 🆕 Phase 1 Integrations
import { QuickBooksConfig } from './nodes/config/QuickBooksConfig';
import { DocuSignConfig } from './nodes/config/DocuSignConfig';
import { TypeformConfig } from './nodes/config/TypeformConfig';
import { CalendlyConfig } from './nodes/config/CalendlyConfig';
import { SupabaseConfig } from './nodes/config/SupabaseConfig';
import { PythonCodeConfig } from './nodes/config/PythonCodeConfig';
import { JavaCodeConfig } from './nodes/config/JavaCodeConfig';

// 🆕 Phase 2A Integrations
import { XeroConfig } from './nodes/config/XeroConfig';
import { FirebaseConfig } from './nodes/config/FirebaseConfig';
import { KafkaConfig } from './nodes/config/KafkaConfig';
import { HelloSignConfig } from './nodes/config/HelloSignConfig';
import { JotFormConfig } from './nodes/config/JotFormConfig';

// 🆕 Phase 2B Integrations
import { FreshBooksConfig } from './nodes/config/FreshBooksConfig';
import { WaveConfig } from './nodes/config/WaveConfig';
import { PandaDocConfig } from './nodes/config/PandaDocConfig';
import { SurveyMonkeyConfig } from './nodes/config/SurveyMonkeyConfig';
import { CalComConfig } from './nodes/config/CalComConfig';

// 🆕 Phase 5.5 Data Processing Nodes
import { SetConfig } from './nodes/config/SetConfig';
import { CodeConfig } from './nodes/config/CodeConfig';
import { FilterConfig } from './nodes/config/FilterConfig';
import { SortConfig } from './nodes/config/SortConfig';
import { MergeConfig } from './nodes/config/MergeConfig';
import { SplitConfig } from './nodes/config/SplitConfig';
import { AggregateConfig } from './nodes/config/AggregateConfig';
import { LimitConfig } from './nodes/config/LimitConfig';

// 🆕 Phase 6 Batch 1: Communication
import { DiscordConfig } from './nodes/config/DiscordConfig';
import { TeamsConfig } from './nodes/config/TeamsConfig';
import { TwilioConfig } from './nodes/config/TwilioConfig';

// 🆕 Phase 6 Batch 2: CRM
import { SalesforceConfig } from './nodes/config/SalesforceConfig';
import { HubSpotConfig } from './nodes/config/HubSpotConfig';
import { PipedriveConfig } from './nodes/config/PipedriveConfig';
import { AirtableConfig } from './nodes/config/AirtableConfig';

// 🆕 Phase 6 Batch 3: E-commerce
import { ShopifyConfig } from './nodes/config/ShopifyConfig';
import { StripeConfig } from './nodes/config/StripeConfig';
import { PayPalConfig } from './nodes/config/PayPalConfig';
import { WooCommerceConfig } from './nodes/config/WooCommerceConfig';

// 🆕 Phase 6 Batch 4: Marketing
import { MailchimpConfig } from './nodes/config/MailchimpConfig';
import { SendGridConfig } from './nodes/config/SendGridConfig';
import { GoogleAnalyticsConfig } from './nodes/config/GoogleAnalyticsConfig';
import { FacebookAdsConfig } from './nodes/config/FacebookAdsConfig';

// 🆕 Phase 6 Batch 5: Storage
import { GoogleDriveConfig } from './nodes/config/GoogleDriveConfig';
import { DropboxConfig } from './nodes/config/DropboxConfig';
import { AWSS3Config } from './nodes/config/AWSS3Config';
import { OneDriveConfig } from './nodes/config/OneDriveConfig';

// 🆕 Phase 8: Critical Integrations (Batch 1)
import { NotionConfig } from './nodes/config/NotionConfig';
import { AsanaConfig } from './nodes/config/AsanaConfig';
import { LinearConfig } from './nodes/config/LinearConfig';
import { ZendeskConfig } from './nodes/config/ZendeskConfig';
import { IntercomConfig } from './nodes/config/IntercomConfig';

// 🆕 Phase 8: Critical Integrations (Batch 2)
import { MondayConfig } from './nodes/config/MondayConfig';
import { ClickUpConfig } from './nodes/config/ClickUpConfig';
import { JiraConfig } from './nodes/config/JiraConfig';
import { ConfluenceConfig } from './nodes/config/ConfluenceConfig';
import { FigmaConfig } from './nodes/config/FigmaConfig';

// 🆕 AGENT 4: Advanced Workflow Features
import { ForEachConfig } from './nodes/config/ForEachConfig';
import { WhileLoopConfig } from './nodes/config/WhileLoopConfig';
import { SwitchCaseConfig } from './nodes/config/SwitchCaseConfig';
import { TryCatchConfig } from './nodes/config/TryCatchConfig';

// 🆕 AGENT 6: Cloud Platform Integrations
// AWS
import { LambdaConfig } from './nodes/config/LambdaConfig';
import { SQSConfig } from './nodes/config/SQSConfig';
import { SNSConfig } from './nodes/config/SNSConfig';
import { DynamoDBConfig } from './nodes/config/DynamoDBConfig';

// Google Cloud
import { CloudStorageConfig } from './nodes/config/CloudStorageConfig';
import { PubSubConfig } from './nodes/config/PubSubConfig';
import { BigQueryConfig } from './nodes/config/BigQueryConfig';

// Azure
import { BlobStorageConfig } from './nodes/config/BlobStorageConfig';
import { ServiceBusConfig } from './nodes/config/ServiceBusConfig';
import { CosmosDBConfig } from './nodes/config/CosmosDBConfig';

// 🆕 AGENT 6: Database Integrations
import { MongoDBConfig } from './nodes/config/MongoDBConfig';
import { MySQLConfig } from './nodes/config/MySQLConfig';
import { RedisConfig } from './nodes/config/RedisConfig';
import { ElasticsearchConfig } from './nodes/config/ElasticsearchConfig';

// 🆕 AGENT 6: Communication Enhancements
import { MailgunConfig } from './nodes/config/MailgunConfig';

// 🆕 AGENT 9: Node Library Expansion - Phase 1
// Core Workflow
import { TransformConfig } from './nodes/config/TransformConfig';
import { ConditionConfig } from './nodes/config/ConditionConfig';
import { LoopConfig } from './nodes/config/LoopConfig';
import { RetryConfig } from './nodes/config/RetryConfig';
import { ErrorWorkflowConfig } from './nodes/config/ErrorWorkflowConfig';
import { ErrorGeneratorConfig } from './nodes/config/ErrorGeneratorConfig';

// Triggers
import { TriggerConfig } from './nodes/config/TriggerConfig';
import { WebhookTriggerConfig } from './nodes/config/WebhookTriggerConfig';
import { RSSFeedConfig } from './nodes/config/RSSFeedConfig';
import { ManualTriggerConfig } from './nodes/config/ManualTriggerConfig';
import { FileWatcherConfig } from './nodes/config/FileWatcherConfig';

// 🆕 n8n Parity: Form & Chat Triggers
import { FormTriggerConfig } from './nodes/config/FormTriggerConfig';
import { ChatTriggerConfig } from './nodes/config/ChatTriggerConfig';

// Data Processing
import { ETLConfig } from './nodes/config/ETLConfig';
import { JSONParserConfig } from './nodes/config/JSONParserConfig';
import { CSVParserConfig } from './nodes/config/CSVParserConfig';
import { XMLParserConfig } from './nodes/config/XMLParserConfig';

// Communication Advanced
import { TelegramConfig } from './nodes/config/TelegramConfig';
import { WhatsAppConfig } from './nodes/config/WhatsAppConfig';
import { ZoomConfig } from './nodes/config/ZoomConfig';
import { GoogleMeetConfig } from './nodes/config/GoogleMeetConfig';
import { RocketChatConfig } from './nodes/config/RocketChatConfig';
import { MattermostConfig } from './nodes/config/MattermostConfig';

// AI & ML
import { OpenAIConfig } from './nodes/config/OpenAIConfig';
import { AnthropicConfig } from './nodes/config/AnthropicConfig';
import { MultiModelAIConfig } from './nodes/config/MultiModelAIConfig';
import { StabilityAIConfig } from './nodes/config/StabilityAIConfig';

// Google Services
import { GoogleSheetsConfig } from './nodes/config/GoogleSheetsConfig';
import { GoogleCalendarConfig } from './nodes/config/GoogleCalendarConfig';
import { GoogleMapsConfig } from './nodes/config/GoogleMapsConfig';

// Storage
import { BoxConfig } from './nodes/config/BoxConfig';

// CRM Extended
import { ZohoCRMConfig } from './nodes/config/ZohoCRMConfig';
import { FreshsalesConfig } from './nodes/config/FreshsalesConfig';

// Project Management Extended
import { TrelloConfig } from './nodes/config/TrelloConfig';

// Databases
import { PostgreSQLConfig } from './nodes/config/PostgreSQLConfig';

// Social Media
import { TwitterConfig } from './nodes/config/TwitterConfig';
import { LinkedInConfig } from './nodes/config/LinkedInConfig';
import { FacebookConfig } from './nodes/config/FacebookConfig';
import { InstagramConfig } from './nodes/config/InstagramConfig';

// Marketing
import { ActiveCampaignConfig } from './nodes/config/ActiveCampaignConfig';

// 🆕 AGENT 19: Complete Node Library Expansion (120+ nodes)
// Database & Data Warehouses
import { SnowflakeConfig } from './nodes/config/SnowflakeConfig';
import { DatabricksConfig } from './nodes/config/DatabricksConfig';
import { RedshiftConfig } from './nodes/config/RedshiftConfig';
import { ClickHouseConfig } from './nodes/config/ClickHouseConfig';
import { TimescaleDBConfig } from './nodes/config/TimescaleDBConfig';
import { InfluxDBConfig } from './nodes/config/InfluxDBConfig';
import { PrometheusConfig } from './nodes/config/PrometheusConfig';
import { Neo4jConfig } from './nodes/config/Neo4jConfig';
import { ArangoDBConfig } from './nodes/config/ArangoDBConfig';
import { CockroachDBConfig } from './nodes/config/CockroachDBConfig';
import { ScyllaDBConfig } from './nodes/config/ScyllaDBConfig';
import { CassandraConfig } from './nodes/config/CassandraConfig';
import { YugabyteDBConfig } from './nodes/config/YugabyteDBConfig';
import { FaunaDBConfig } from './nodes/config/FaunaDBConfig';
import { PlanetScaleConfig } from './nodes/config/PlanetScaleConfig';
import { NeonConfig } from './nodes/config/NeonConfig';
import { CloudSpannerConfig } from './nodes/config/CloudSpannerConfig';
import { OrientDBConfig } from './nodes/config/OrientDBConfig';
import { VectorStoreConfig } from './nodes/config/VectorStoreConfig';
import { GraphQLDatabaseConfig } from './nodes/config/GraphQLDatabaseConfig';
import { SurrealDBConfig } from './nodes/config/SurrealDBConfig';

// 🆕 Vector Store / LangChain Integrations
import { PineconeVectorStoreConfig } from './nodes/config/PineconeVectorStoreConfig';
import { ChromaVectorStoreConfig } from './nodes/config/ChromaVectorStoreConfig';
import { WeaviateVectorStoreConfig } from './nodes/config/WeaviateVectorStoreConfig';
import { QdrantVectorStoreConfig } from './nodes/config/QdrantVectorStoreConfig';
import { EmbeddingsConfig } from './nodes/config/EmbeddingsConfig';
import { DocumentLoaderConfig } from './nodes/config/DocumentLoaderConfig';
import { TextSplitterConfig } from './nodes/config/TextSplitterConfig';

// Marketing & SEO
import { SemrushConfig } from './nodes/config/SemrushConfig';
import { AhrefsConfig } from './nodes/config/AhrefsConfig';
import { MozConfig } from './nodes/config/MozConfig';
import { GoogleSearchConsoleConfig } from './nodes/config/GoogleSearchConsoleConfig';
import { GoogleTagManagerConfig } from './nodes/config/GoogleTagManagerConfig';
import { LinkedInAdsConfig } from './nodes/config/LinkedInAdsConfig';
import { TwitterAdsConfig } from './nodes/config/TwitterAdsConfig';
import { TikTokAdsConfig } from './nodes/config/TikTokAdsConfig';
import { PinterestAdsConfig } from './nodes/config/PinterestAdsConfig';
import { KlaviyoConfig } from './nodes/config/KlaviyoConfig';
import { BingWebmasterConfig } from './nodes/config/BingWebmasterConfig';
import { GA4Config } from './nodes/config/GA4Config';
import { ConvertKitConfig } from './nodes/config/ConvertKitConfig';
import { MailerLiteConfig } from './nodes/config/MailerLiteConfig';
import { GetResponseConfig } from './nodes/config/GetResponseConfig';

// Customer Service & Support
import { FreshdeskConfig } from './nodes/config/FreshdeskConfig';
import { Drift as DriftConfig } from './nodes/config/DriftConfig';
import { HelpScout as HelpScoutConfig } from './nodes/config/HelpScoutConfig';
import { Front as FrontConfig } from './nodes/config/FrontConfig';
import { Gorgias as GorgiasConfig } from './nodes/config/GorgiasConfig';
import { Kustomer as KustomerConfig } from './nodes/config/KustomerConfig';
import { Reamaze as ReamazeConfig } from './nodes/config/ReamazeConfig';
import { LiveChat as LiveChatConfig } from './nodes/config/LiveChatConfig';
import { Crisp as CrispConfig } from './nodes/config/CrispConfig';
import { TawkTo as TawkToConfig } from './nodes/config/TawkToConfig';
import { Tidio as TidioConfig } from './nodes/config/TidioConfig';
import { Chatwoot as ChatwootConfig } from './nodes/config/ChatwootConfig';
import { Olark as OlarkConfig } from './nodes/config/OlarkConfig';

// HR & Recruiting
import { BambooHR as BambooHRConfig } from './nodes/config/BambooHRConfig';
import { Workday as WorkdayConfig } from './nodes/config/WorkdayConfig';
import { ADP as ADPConfig } from './nodes/config/ADPConfig';
import { Greenhouse as GreenhouseConfig } from './nodes/config/GreenhouseConfig';
import { Lever as LeverConfig } from './nodes/config/LeverConfig';
import { Ashby as AshbyConfig } from './nodes/config/AshbyConfig';
import { LinkedInTalent as LinkedInTalentConfig } from './nodes/config/LinkedInTalentConfig';
import { Indeed as IndeedConfig } from './nodes/config/IndeedConfig';
import { Gusto as GustoConfig } from './nodes/config/GustoConfig';
import { Rippling as RipplingConfig } from './nodes/config/RipplingConfig';

// Accounting & ERP
import { Sage as SageConfig } from './nodes/config/SageConfig';
import { NetSuite as NetSuiteConfig } from './nodes/config/NetSuiteConfig';
import { SAP as SAPConfig } from './nodes/config/SAPConfig';
import { OracleERP as OracleERPConfig } from './nodes/config/OracleERPConfig';
import { Odoo as OdooConfig } from './nodes/config/OdooConfig';
import { MicrosoftDynamics as MicrosoftDynamicsConfig } from './nodes/config/MicrosoftDynamicsConfig';
import { ZohoBooks as ZohoBooksConfig } from './nodes/config/ZohoBooksConfig';
import { ZohoInventory as ZohoInventoryConfig } from './nodes/config/ZohoInventoryConfig';
import { Bill as BillConfig } from './nodes/config/BillConfig';
import { Expensify as ExpensifyConfig } from './nodes/config/ExpensifyConfig';

// Video & Media
import { YouTube as YouTubeConfig } from './nodes/config/YouTubeConfig';
import { Vimeo as VimeoConfig } from './nodes/config/VimeoConfig';
import { Twitch as TwitchConfig } from './nodes/config/TwitchConfig';
import { StreamYard as StreamYardConfig } from './nodes/config/StreamYardConfig';
import { Cloudinary as CloudinaryConfig } from './nodes/config/CloudinaryConfig';
import { Imgix as ImgixConfig } from './nodes/config/ImgixConfig';
import { ImageKit as ImageKitConfig } from './nodes/config/ImageKitConfig';
import { Mux as MuxConfig } from './nodes/config/MuxConfig';
import { Wistia as WistiaConfig } from './nodes/config/WistiaConfig';
import { Vidyard as VidyardConfig } from './nodes/config/VidyardConfig';

// Cloud Services
import { AWSEC2 as AWSEC2Config } from './nodes/config/AWSEC2Config';
import { AWSCloudWatch as AWSCloudWatchConfig } from './nodes/config/AWSCloudWatchConfig';
import { GoogleCloudFunctions as GoogleCloudFunctionsConfig } from './nodes/config/GoogleCloudFunctionsConfig';
import { GoogleCloudRun as GoogleCloudRunConfig } from './nodes/config/GoogleCloudRunConfig';
import { AzureFunctions as AzureFunctionsConfig } from './nodes/config/AzureFunctionsConfig';
import { AzureAppService as AzureAppServiceConfig } from './nodes/config/AzureAppServiceConfig';
import { Vercel as VercelConfig } from './nodes/config/VercelConfig';
import { Netlify as NetlifyConfig } from './nodes/config/NetlifyConfig';
import { DigitalOcean as DigitalOceanConfig } from './nodes/config/DigitalOceanConfig';
import { Linode as LinodeConfig } from './nodes/config/LinodeConfig';
import { Vultr as VultrConfig } from './nodes/config/VultrConfig';
import { CloudflareWorkers as CloudflareWorkersConfig } from './nodes/config/CloudflareWorkersConfig';
import { Heroku as HerokuConfig } from './nodes/config/HerokuConfig';
import { Render as RenderConfig } from './nodes/config/RenderConfig';
import { Flyio as FlyioConfig } from './nodes/config/FlyioConfig';

// IoT & Hardware
import { Arduino as ArduinoConfig } from './nodes/config/ArduinoConfig';
import { RaspberryPi as RaspberryPiConfig } from './nodes/config/RaspberryPiConfig';
import { Particle as ParticleConfig } from './nodes/config/ParticleConfig';
import { AdafruitIO as AdafruitIOConfig } from './nodes/config/AdafruitIOConfig';
import { ThingSpeak as ThingSpeakConfig } from './nodes/config/ThingSpeakConfig';
import { Losant as LosantConfig } from './nodes/config/LosantConfig';
import { AWSIoT as AWSIoTConfig } from './nodes/config/AWSIoTConfig';
import { AzureIoTHub as AzureIoTHubConfig } from './nodes/config/AzureIoTHubConfig';
import { GoogleCloudIoT as GoogleCloudIoTConfig } from './nodes/config/GoogleCloudIoTConfig';
import { Ubidots as UbidotsConfig } from './nodes/config/UbidotsConfig';

// Blockchain & Crypto
import { Ethereum as EthereumConfig } from './nodes/config/EthereumConfig';
import { Bitcoin as BitcoinConfig } from './nodes/config/BitcoinConfig';
import { Polygon as PolygonConfig } from './nodes/config/PolygonConfig';
import { Solana as SolanaConfig } from './nodes/config/SolanaConfig';
import { Avalanche as AvalancheConfig } from './nodes/config/AvalancheConfig';
import { BSC as BSCConfig } from './nodes/config/BSCConfig';
import { Coinbase as CoinbaseConfig } from './nodes/config/CoinbaseConfig';
import { Kraken as KrakenConfig } from './nodes/config/KrakenConfig';
import { Binance as BinanceConfig } from './nodes/config/BinanceConfig';
import { MetaMask as MetaMaskConfig } from './nodes/config/MetaMaskConfig';

// Miscellaneous Utilities
import { RSSReader as RSSReaderConfig } from './nodes/config/RSSReaderConfig';
import { XMLParserV2 as XMLParserV2Config } from './nodes/config/XMLParserV2Config';
import { JSONParserV2 as JSONParserV2Config } from './nodes/config/JSONParserV2Config';
import { CSVParserV2 as CSVParserV2Config } from './nodes/config/CSVParserV2Config';
import { ExcelReader as ExcelReaderConfig } from './nodes/config/ExcelReaderConfig';
import { ExcelWriter as ExcelWriterConfig } from './nodes/config/ExcelWriterConfig';
import { PDFGenerator as PDFGeneratorConfig } from './nodes/config/PDFGeneratorConfig';
import { PDFReader as PDFReaderConfig } from './nodes/config/PDFReaderConfig';
import { ImageProcessing as ImageProcessingConfig } from './nodes/config/ImageProcessingConfig';
import { BarcodeGenerator as BarcodeGeneratorConfig } from './nodes/config/BarcodeGeneratorConfig';
import { QRCodeGenerator as QRCodeGeneratorConfig } from './nodes/config/QRCodeGeneratorConfig';
import { OCR as OCRConfig } from './nodes/config/OCRConfig';
import { OpenWeather as OpenWeatherConfig } from './nodes/config/OpenWeatherConfig';
import { WeatherAPI as WeatherAPIConfig } from './nodes/config/WeatherAPIConfig';
import { Mapbox as MapboxConfig } from './nodes/config/MapboxConfig';

// 🆕 n8n Parity: Core Utility Nodes
import { RespondToWebhookConfig } from './nodes/config/RespondToWebhookConfig';
import { StopAndErrorConfig } from './nodes/config/StopAndErrorConfig';
import { ItemListsConfig } from './nodes/config/ItemListsConfig';
import { DateTimeConfig } from './nodes/config/DateTimeConfig';
import { CryptoConfig } from './nodes/config/CryptoConfig';
import { CompareDatasetsConfig } from './nodes/config/CompareDatasetsConfig';
import ExecuteCommandConfig from './nodes/config/ExecuteCommandConfig';
import { HtmlConfig } from './nodes/config/HtmlConfig';
import { MarkdownConfig } from './nodes/config/MarkdownConfig';
import { CompressionConfig } from './nodes/config/CompressionConfig';
import { SplitInBatchesConfig } from './nodes/config/SplitInBatchesConfig';

// 🆕 n8n Parity: Wait Node
import WaitConfig from './nodes/config/WaitConfig';

// 🆕 n8n 2024-2025 Feature Parity
import AITransformConfig from './nodes/config/AITransformConfig';
import AIGuardrailsConfig from './nodes/config/AIGuardrailsConfig';
import AIAgentConfig from './nodes/config/AIAgentConfig';
import AIContentModeratorConfig from './nodes/config/AIContentModeratorConfig';
import AIDataExtractorConfig from './nodes/config/AIDataExtractorConfig';
import AIEntityExtractorConfig from './nodes/config/AIEntityExtractorConfig';
import AISentimentAnalysisConfig from './nodes/config/AISentimentAnalysisConfig';
import AITextClassifierConfig from './nodes/config/AITextClassifierConfig';
import MCPClientConfig from './nodes/config/MCPClientConfig';
import JWTConfig from './nodes/config/JWTConfig';
import SSHConfig from './nodes/config/SSHConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, React.ComponentType<any>> = {
  httpRequest: HttpRequestConfig,
  email: EmailConfig,
  gmail: EmailConfig,
  slack: SlackConfig,
  schedule: ScheduleConfig,
  delay: DelayConfig,
  approval: ApprovalConfig,
  subWorkflow: SubWorkflowConfig,
  default: DefaultConfig,

  // 🆕 Accounting & Finance
  quickbooks: QuickBooksConfig,
  xero: XeroConfig,
  freshbooks: FreshBooksConfig,
  wave: WaveConfig,

  // 🆕 E-Signature
  docusign: DocuSignConfig,
  hellosign: HelloSignConfig,
  pandadoc: PandaDocConfig,

  // 🆕 Forms & Surveys
  typeform: TypeformConfig,
  jotform: JotFormConfig,
  surveymonkey: SurveyMonkeyConfig,

  // 🆕 Scheduling
  calendly: CalendlyConfig,
  calcom: CalComConfig,

  // 🆕 Backend as Service
  supabase: SupabaseConfig,
  firebase: FirebaseConfig,
  hasura: HasuraConfig,
  strapiCMS: StrapiConfig,

  // 🆕 Advanced Databases
  kafka: KafkaConfig,
  // clickhouse and databricks are registered below in AGENT 19 section

  // 🆕 Code Execution
  pythonCode: PythonCodeConfig,
  javaCode: JavaCodeConfig,

  // 🆕 Multi-Model AI - see line 358 for actual implementation

  // 🆕 Data Processing Nodes (Phase 5.5)
  set: SetConfig,
  code: CodeConfig,
  jsCode: CodeConfig, // Alias for code node
  filter: FilterConfig,
  sort: SortConfig,
  merge: MergeConfig,
  split: SplitConfig,
  aggregate: AggregateConfig,
  limit: LimitConfig,

  // 🆕 Phase 6 Batch 1: Communication
  discord: DiscordConfig,
  teams: TeamsConfig,
  twilio: TwilioConfig,

  // 🆕 Phase 6 Batch 2: CRM
  salesforce: SalesforceConfig,
  hubspot: HubSpotConfig,
  pipedrive: PipedriveConfig,
  airtable: AirtableConfig,

  // 🆕 Phase 6 Batch 3: E-commerce
  shopify: ShopifyConfig,
  stripe: StripeConfig,
  paypal: PayPalConfig,
  woocommerce: WooCommerceConfig,

  // 🆕 Phase 6 Batch 4: Marketing
  mailchimp: MailchimpConfig,
  sendgrid: SendGridConfig,
  googleAnalytics: GoogleAnalyticsConfig,
  facebookAds: FacebookAdsConfig,

  // 🆕 Phase 6 Batch 5: Storage
  googleDrive: GoogleDriveConfig,
  dropbox: DropboxConfig,
  awsS3: AWSS3Config,
  onedrive: OneDriveConfig,

  // 🆕 Phase 8: Critical Integrations (Batch 1)
  notion: NotionConfig,
  asana: AsanaConfig,
  linear: LinearConfig,
  zendesk: ZendeskConfig,
  intercom: IntercomConfig,

  // 🆕 Phase 8: Critical Integrations (Batch 2)
  monday: MondayConfig,
  clickup: ClickUpConfig,
  jira: JiraConfig,
  confluence: ConfluenceConfig,
  figma: FigmaConfig,

  // 🆕 AGENT 4: Advanced Workflow Features
  forEach: ForEachConfig,
  whileLoop: WhileLoopConfig,
  switchCase: SwitchCaseConfig,
  tryCatch: TryCatchConfig,

  // 🆕 AGENT 6: Cloud Platform Integrations
  // AWS
  lambda: LambdaConfig,
  awsLambda: LambdaConfig,
  sqs: SQSConfig,
  awsSQS: SQSConfig,
  sns: SNSConfig,
  awsSNS: SNSConfig,
  dynamodb: DynamoDBConfig,
  awsDynamoDB: DynamoDBConfig,

  // Google Cloud
  cloudStorage: CloudStorageConfig,
  gcs: CloudStorageConfig,
  googleCloudStorage: CloudStorageConfig,
  pubsub: PubSubConfig,
  googlePubSub: PubSubConfig,
  bigquery: BigQueryConfig,
  googleBigQuery: BigQueryConfig,

  // Azure
  blobStorage: BlobStorageConfig,
  azureBlobStorage: BlobStorageConfig,
  serviceBus: ServiceBusConfig,
  azureServiceBus: ServiceBusConfig,
  cosmosdb: CosmosDBConfig,
  azureCosmosDB: CosmosDBConfig,

  // 🆕 AGENT 6: Database Integrations
  mongodb: MongoDBConfig,
  mysql: MySQLConfig,
  redis: RedisConfig,
  elasticsearch: ElasticsearchConfig,

  // 🆕 AGENT 6: Communication Enhancements
  mailgun: MailgunConfig,

  // 🆕 AGENT 9: Core Workflow Nodes
  transform: TransformConfig,
  condition: ConditionConfig,
  loop: LoopConfig,
  retry: RetryConfig,
  errorWorkflow: ErrorWorkflowConfig,
  errorGenerator: ErrorGeneratorConfig,

  // 🆕 AGENT 9: Trigger Nodes
  trigger: TriggerConfig,
  webhook: WebhookTriggerConfig,
  rssFeed: RSSFeedConfig,
  manualTrigger: ManualTriggerConfig,
  fileWatcher: FileWatcherConfig,

  // 🆕 n8n Parity: Form & Chat Triggers
  formTrigger: FormTriggerConfig,
  chatTrigger: ChatTriggerConfig,

  // 🆕 AGENT 9: Data Processing Nodes
  etl: ETLConfig,
  jsonParser: JSONParserConfig,
  csvParser: CSVParserConfig,
  xmlParser: XMLParserConfig,

  // 🆕 AGENT 9: Communication Advanced
  telegram: TelegramConfig,
  whatsapp: WhatsAppConfig,
  zoom: ZoomConfig,
  googlemeet: GoogleMeetConfig,
  googleMeet: GoogleMeetConfig, // alias
  rocketchat: RocketChatConfig,
  mattermost: MattermostConfig,

  // 🆕 AGENT 9: AI & ML
  openai: OpenAIConfig,
  anthropic: AnthropicConfig,
  multiModelAI: MultiModelAIConfig, // AGENT 9 version (keep this one)

  // 🆕 AGENT 9: Google Services
  googleSheets: GoogleSheetsConfig,
  googleCalendar: GoogleCalendarConfig,
  googleMaps: GoogleMapsConfig,

  // 🆕 AGENT 9: Storage
  box: BoxConfig,

  // 🆕 AGENT 9: CRM Extended
  zohocrm: ZohoCRMConfig,
  freshsales: FreshsalesConfig,

  // 🆕 AGENT 9: Project Management
  trello: TrelloConfig,

  // 🆕 AGENT 9: Databases
  postgres: PostgreSQLConfig,
  postgresql: PostgreSQLConfig, // alias

  // 🆕 AGENT 9: Social Media
  twitter: TwitterConfig,
  linkedin: LinkedInConfig,
  facebook: FacebookConfig,
  instagram: InstagramConfig,

  // 🆕 AGENT 9: Marketing
  activecampaign: ActiveCampaignConfig,

  // 🆕 AGENT 17: AI & ML Nodes (80+ new integrations)
  // AI & ML
  stabilityAI: StabilityAIConfig,
  replicate: ReplicateConfig,
  claudeVision: DefaultConfig,
  gpt4Vision: DefaultConfig,
  googleAI: DefaultConfig,
  ai21Labs: DefaultConfig,
  midjourney: DefaultConfig,
  dalle: DefaultConfig,
  whisper: DefaultConfig,
  elevenlabs: DefaultConfig,
  azureOpenAI: DefaultConfig,
  googleGemini: DefaultConfig,
  anthropicClaude3: DefaultConfig,
  openaiEmbeddings: DefaultConfig,
  cohereEmbed: DefaultConfig,

  // Communication & Messaging
  rabbitmq: DefaultConfig,
  amazonSQS: DefaultConfig,
  amazonSNS: DefaultConfig,
  // googlePubSub: already defined above (line 304)
  // azureServiceBus: already defined above (line 312)
  twilioSendGrid: DefaultConfig,
  postmark: DefaultConfig,
  mailgunEmail: DefaultConfig,
  discordBot: DefaultConfig,
  mattermostChat: DefaultConfig,
  rocketChat: DefaultConfig,
  signalMessenger: DefaultConfig,
  whatsappBusiness: DefaultConfig,
  telegramBot: DefaultConfig,
  apacheKafka: DefaultConfig,

  // CRM & Sales
  hubspotCRM: HubSpotConfig, // Already exists
  pipedriveCRM: PipedriveConfig, // Already exists
  salesforceCRM: SalesforceConfig, // Already exists
  zohoCRM: ZohoCRMConfig, // Already exists
  freshsalesCRM: FreshsalesConfig, // Already exists
  closeCRM: DefaultConfig,
  copperCRM: DefaultConfig,
  insightlyCRM: DefaultConfig,
  nimbleCRM: DefaultConfig,
  sugarCRM: DefaultConfig,

  // E-commerce
  shopifyStore: ShopifyConfig, // Already exists
  wooCommerceStore: WooCommerceConfig, // Already exists
  magentoStore: DefaultConfig,
  bigCommerceStore: DefaultConfig,
  prestashop: DefaultConfig,
  opencart: DefaultConfig,
  ecwid: DefaultConfig,
  squareCommerce: DefaultConfig,
  chargebee: DefaultConfig,
  recurly: DefaultConfig,

  // Finance & Payments
  stripePayments: StripeConfig, // Already exists
  paypalPayments: PayPalConfig, // Already exists
  braintree: DefaultConfig,
  adyen: DefaultConfig,
  squarePayments: DefaultConfig,
  klarna: DefaultConfig,
  plaid: DefaultConfig,
  dwolla: DefaultConfig,
  mollie: DefaultConfig,
  twocheckout: DefaultConfig,

  // Productivity & Project Management
  notionDatabase: NotionConfig, // Already exists
  airtableBase: AirtableConfig, // Already exists
  mondayBoards: MondayConfig, // Already exists
  clickupTasks: ClickUpConfig, // Already exists
  basecampProject: DefaultConfig,
  wrikeProject: DefaultConfig,
  smartsheetGrid: DefaultConfig,
  codaDocs: DefaultConfig,
  fiberyApp: DefaultConfig,
  heightApp: DefaultConfig,

  // Developer Tools & DevOps
  githubAdvanced: DefaultConfig, // Use GitHub config as base
  gitlabAdvanced: DefaultConfig,
  bitbucketRepo: DefaultConfig,
  jenkinsCI: DefaultConfig,
  circleCIBuild: DefaultConfig,
  travisCI: DefaultConfig,
  azureDevOpsCI: DefaultConfig,
  jiraAdvanced: JiraConfig, // Already exists
  linearAdvanced: LinearConfig, // Already exists
  sentryMonitoring: DefaultConfig,

  // 🆕 AGENT 19: Complete Node Library (120+ registrations)
  // Database & Data Warehouses
  snowflake: SnowflakeConfig,
  databricks: DatabricksConfig,
  redshift: RedshiftConfig,
  clickhouse: ClickHouseConfig,
  timescaledb: TimescaleDBConfig,
  influxdb: InfluxDBConfig,
  prometheus: PrometheusConfig,
  neo4j: Neo4jConfig,
  arangodb: ArangoDBConfig,
  cockroachdb: CockroachDBConfig,
  scylladb: ScyllaDBConfig,
  cassandra: CassandraConfig,
  yugabytedb: YugabyteDBConfig,
  faunadb: FaunaDBConfig,
  planetscale: PlanetScaleConfig,
  neon: NeonConfig,
  cloudspanner: CloudSpannerConfig,
  orientdb: OrientDBConfig,
  vectorstore: VectorStoreConfig,
  graphqldatabase: GraphQLDatabaseConfig,
  surrealdb: SurrealDBConfig,

  // 🆕 Vector Store / LangChain Integrations
  pinecone: PineconeVectorStoreConfig,
  pineconeVectorStore: PineconeVectorStoreConfig,
  chroma: ChromaVectorStoreConfig,
  chromaVectorStore: ChromaVectorStoreConfig,
  weaviate: WeaviateVectorStoreConfig,
  weaviateVectorStore: WeaviateVectorStoreConfig,
  qdrant: QdrantVectorStoreConfig,
  qdrantVectorStore: QdrantVectorStoreConfig,
  embeddings: EmbeddingsConfig,
  generateEmbeddings: EmbeddingsConfig,
  documentLoader: DocumentLoaderConfig,
  loadDocument: DocumentLoaderConfig,
  textSplitter: TextSplitterConfig,
  splitText: TextSplitterConfig,

  // Marketing & SEO
  semrush: SemrushConfig,
  ahrefs: AhrefsConfig,
  moz: MozConfig,
  googlesearchconsole: GoogleSearchConsoleConfig,
  googletagmanager: GoogleTagManagerConfig,
  linkedinads: LinkedInAdsConfig,
  twitterads: TwitterAdsConfig,
  tiktokads: TikTokAdsConfig,
  pinterestads: PinterestAdsConfig,
  klaviyo: KlaviyoConfig,
  bingwebmaster: BingWebmasterConfig,
  ga4: GA4Config,
  convertkit: ConvertKitConfig,
  mailerlite: MailerLiteConfig,
  getresponse: GetResponseConfig,

  // Customer Service & Support
  freshdesk: FreshdeskConfig,
  drift: DriftConfig,
  helpscout: HelpScoutConfig,
  front: FrontConfig,
  gorgias: GorgiasConfig,
  kustomer: KustomerConfig,
  reamaze: ReamazeConfig,
  livechat: LiveChatConfig,
  crisp: CrispConfig,
  tawkto: TawkToConfig,
  tidio: TidioConfig,
  chatwoot: ChatwootConfig,
  olark: OlarkConfig,

  // HR & Recruiting
  bamboohr: BambooHRConfig,
  workday: WorkdayConfig,
  adp: ADPConfig,
  greenhouse: GreenhouseConfig,
  lever: LeverConfig,
  ashby: AshbyConfig,
  linkedintalent: LinkedInTalentConfig,
  indeed: IndeedConfig,
  gusto: GustoConfig,
  rippling: RipplingConfig,

  // Accounting & ERP
  sage: SageConfig,
  netsuite: NetSuiteConfig,
  sap: SAPConfig,
  oracleerp: OracleERPConfig,
  odoo: OdooConfig,
  microsoftdynamics: MicrosoftDynamicsConfig,
  zohobooks: ZohoBooksConfig,
  zohoinventory: ZohoInventoryConfig,
  bill: BillConfig,
  expensify: ExpensifyConfig,

  // Video & Media
  youtube: YouTubeConfig,
  vimeo: VimeoConfig,
  twitch: TwitchConfig,
  streamyard: StreamYardConfig,
  cloudinary: CloudinaryConfig,
  imgix: ImgixConfig,
  imagekit: ImageKitConfig,
  mux: MuxConfig,
  wistia: WistiaConfig,
  vidyard: VidyardConfig,

  // Cloud Services
  awsec2: AWSEC2Config,
  awscloudwatch: AWSCloudWatchConfig,
  googlecloudfunctions: GoogleCloudFunctionsConfig,
  googlecloudrun: GoogleCloudRunConfig,
  azurefunctions: AzureFunctionsConfig,
  azureappservice: AzureAppServiceConfig,
  vercel: VercelConfig,
  netlify: NetlifyConfig,
  digitalocean: DigitalOceanConfig,
  linode: LinodeConfig,
  vultr: VultrConfig,
  cloudflareworkers: CloudflareWorkersConfig,
  heroku: HerokuConfig,
  render: RenderConfig,
  flyio: FlyioConfig,

  // IoT & Hardware
  arduino: ArduinoConfig,
  raspberrypi: RaspberryPiConfig,
  particle: ParticleConfig,
  adafruitio: AdafruitIOConfig,
  thingspeak: ThingSpeakConfig,
  losant: LosantConfig,
  awsiot: AWSIoTConfig,
  azureiothub: AzureIoTHubConfig,
  googlecloudiot: GoogleCloudIoTConfig,
  ubidots: UbidotsConfig,

  // Blockchain & Crypto
  ethereum: EthereumConfig,
  bitcoin: BitcoinConfig,
  polygon: PolygonConfig,
  solana: SolanaConfig,
  avalanche: AvalancheConfig,
  bsc: BSCConfig,
  coinbase: CoinbaseConfig,
  kraken: KrakenConfig,
  binance: BinanceConfig,
  metamask: MetaMaskConfig,

  // Miscellaneous Utilities
  rssreader: RSSReaderConfig,
  xmlparserv2: XMLParserV2Config,
  jsonparserv2: JSONParserV2Config,
  csvparserv2: CSVParserV2Config,
  excelreader: ExcelReaderConfig,
  excelwriter: ExcelWriterConfig,
  pdfgenerator: PDFGeneratorConfig,
  pdfreader: PDFReaderConfig,
  imageprocessing: ImageProcessingConfig,
  barcodegenerator: BarcodeGeneratorConfig,
  qrcodegenerator: QRCodeGeneratorConfig,
  ocr: OCRConfig,
  openweather: OpenWeatherConfig,
  weatherapi: WeatherAPIConfig,
  mapbox: MapboxConfig,

  // 🆕 n8n Parity: Core Utility Nodes
  respondToWebhook: RespondToWebhookConfig,
  stopAndError: StopAndErrorConfig,
  noOperation: DefaultConfig,
  itemLists: ItemListsConfig,
  dateTime: DateTimeConfig,
  crypto: CryptoConfig,
  compareDatasets: CompareDatasetsConfig,
  executeCommand: ExecuteCommandConfig,
  html: HtmlConfig,
  markdown: MarkdownConfig,
  compression: CompressionConfig,
  splitInBatches: SplitInBatchesConfig,
  removeDuplicates: ItemListsConfig, // uses same config with operation=removeDuplicates
  renameKeys: DefaultConfig,
  splitOut: ItemListsConfig, // uses same config with operation=split
  summarize: ItemListsConfig, // uses same config with operation=summarize
  editFields: DefaultConfig,
  executeWorkflowTrigger: DefaultConfig,

  // 🆕 n8n Parity: Wait Node
  wait: WaitConfig,

  // 🆕 n8n 2024-2025 Feature Parity: AI Nodes
  aiTransform: AITransformConfig,
  aiGuardrails: AIGuardrailsConfig,
  aiAgent: AIAgentConfig,
  aiContentModerator: AIContentModeratorConfig,
  aiDataExtractor: AIDataExtractorConfig,
  aiEntityExtractor: AIEntityExtractorConfig,
  aiSentimentAnalysis: AISentimentAnalysisConfig,
  aiTextClassifier: AITextClassifierConfig,
  mcpClient: MCPClientConfig,
  mcpServerTrigger: DefaultConfig,
  respondToChat: DefaultConfig,
  aiCodeGenerator: DefaultConfig,
  groq: DefaultConfig,
  ollama: DefaultConfig,
  mistral: DefaultConfig,
  perplexity: DefaultConfig,
  togetherAI: DefaultConfig,
  fireworksAI: DefaultConfig,
  anyscale: DefaultConfig,

  // 🆕 n8n 2024-2025 Feature Parity: Utility Nodes
  jwt: JWTConfig,
  totp: DefaultConfig,
  ssh: SSHConfig,
  ftp: DefaultConfig,
  git: DefaultConfig,
  ldap: DefaultConfig,
  debugHelper: DefaultConfig,
  dataTable: DefaultConfig,
  readWriteFile: DefaultConfig,
  convertToFile: DefaultConfig,
  extractFromFile: DefaultConfig,
  editImage: DefaultConfig,
  base64: DefaultConfig,
  executeWorkflow: DefaultConfig,
  executionData: DefaultConfig,
  noop: DefaultConfig,
  arrayOperations: DefaultConfig,
  dataMapping: DefaultConfig,
  jsonTransform: DefaultConfig,

  // 🆕 n8n 2024-2025 Feature Parity: Triggers
  sseTrigger: DefaultConfig,
  activationTrigger: DefaultConfig,
  evaluationTrigger: DefaultConfig,
  workflowTrigger: DefaultConfig,
  n8nTrigger: DefaultConfig,
  localFileTrigger: DefaultConfig,
  errorTrigger: DefaultConfig,
  pollingTrigger: DefaultConfig,
  mqttTrigger: DefaultConfig,
  amqpTrigger: DefaultConfig,
  kafkaTrigger: DefaultConfig,
  redisTrigger: DefaultConfig,
  graphqlTrigger: DefaultConfig,
  websocketTrigger: DefaultConfig,
};

export default registry;
