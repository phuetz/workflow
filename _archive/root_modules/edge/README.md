# Edge Computing & IoT Integration - Workflow Automation Platform

This module provides comprehensive edge computing capabilities and IoT device integration for the Workflow Automation Platform.

## 🌐 Architecture Overview

### Edge Gateway
- **Multi-protocol support**: MQTT, CoAP, WebSocket, TCP, UDP
- **Device management**: Registration, authentication, monitoring
- **Edge compute**: Local processing and inference
- **Data processing**: Filtering, aggregation, transformation
- **Rule engine**: Event-driven automation
- **Offline support**: Store-and-forward capability

### IoT Devices
- **Smart sensors**: Edge ML, data filtering, alerts
- **Industrial devices**: Modbus, OPC-UA support
- **Consumer devices**: BLE, Zigbee, Z-Wave
- **LPWAN devices**: LoRaWAN, NB-IoT, Sigfox

### Edge Compute Engine
- **JavaScript sandboxing**: Secure code execution
- **WebAssembly**: High-performance computing
- **ML inference**: TensorFlow Lite, ONNX Runtime
- **Resource management**: CPU, memory, GPU allocation
- **Function deployment**: Serverless at the edge

## 🚀 Getting Started

### Edge Gateway Setup

```bash
cd edge/gateway
npm install
npm run build

# Start edge gateway
npm run start:gateway

# Configuration
export EDGE_GATEWAY_ID="gateway-001"
export EDGE_LOCATION_LAT="37.7749"
export EDGE_LOCATION_LON="-122.4194"
```

### Deploy Edge Function

```javascript
// Deploy a temperature monitoring function
const functionCode = `
  function processTemperature(data) {
    const temp = data.temperature;
    
    if (temp > 30) {
      return {
        alert: 'high_temperature',
        action: 'activate_cooling',
        temperature: temp
      };
    }
    
    return { status: 'normal', temperature: temp };
  }
`;

const functionId = await edgeGateway.deployEdgeFunction(functionCode, [
  {
    condition: { sensor: 'temperature', type: 'reading' },
    params: {}
  }
]);
```

### Connect IoT Device

```javascript
// Create a smart sensor
const sensor = new SmartSensor({
  id: 'sensor-001',
  type: 'environmental',
  name: 'Room Temperature Sensor',
  sensors: [{
    id: 'temp',
    type: 'temperature',
    unit: 'celsius',
    range: { min: -40, max: 85 },
    accuracy: 0.5,
    samplingRate: 1 // Hz
  }],
  communication: {
    protocol: 'mqtt',
    endpoint: 'mqtt://edge-gateway:1883',
    interval: 5000 // ms
  },
  edgeProcessing: {
    enabled: true,
    filters: ['kalman'],
    aggregation: {
      window: 60, // seconds
      functions: ['mean', 'min', 'max', 'std']
    }
  }
});

// Start data collection
await sensor.startDataCollection();
```

## 📡 Protocol Support

### MQTT
- **Broker**: Built-in MQTT broker
- **QoS levels**: 0, 1, 2
- **Retained messages**: Yes
- **Will messages**: Supported
- **SSL/TLS**: Optional

### CoAP
- **Methods**: GET, POST, PUT, DELETE
- **Observe**: Resource observation
- **Block transfer**: Large payloads
- **DTLS**: Security support

### Industrial Protocols
- **Modbus TCP/RTU**: Read/write registers
- **OPC-UA**: Browse, read, write, subscribe
- **PROFINET**: Real-time communication
- **EtherCAT**: Deterministic control

### LPWAN
- **LoRaWAN**: Class A, B, C devices
- **NB-IoT**: Narrow band cellular
- **Sigfox**: Ultra-narrow band

## 🔧 Device Types

### Environmental Sensors
```javascript
{
  temperature: { range: [-40, 125], unit: 'celsius' },
  humidity: { range: [0, 100], unit: 'percent' },
  pressure: { range: [300, 1100], unit: 'hPa' },
  airQuality: { range: [0, 500], unit: 'AQI' }
}
```

### Industrial Sensors
```javascript
{
  vibration: { axes: ['x', 'y', 'z'], unit: 'm/s²' },
  current: { range: [0, 100], unit: 'A' },
  voltage: { range: [0, 480], unit: 'V' },
  power: { unit: 'kW' },
  flowRate: { unit: 'm³/h' }
}
```

### Smart Actuators
```javascript
{
  relay: { states: ['on', 'off'] },
  motor: { speed: [0, 3000], unit: 'rpm' },
  valve: { position: [0, 100], unit: 'percent' },
  dimmer: { level: [0, 100], unit: 'percent' }
}
```

## 🧮 Edge Computing

### Data Processing Pipeline

1. **Ingestion**: Multi-protocol data reception
2. **Validation**: Schema and security checks
3. **Filtering**: Noise reduction, outlier detection
4. **Transformation**: Unit conversion, normalization
5. **Aggregation**: Time-window statistics
6. **Rules**: Condition evaluation
7. **Actions**: Alerts, commands, storage

### Edge ML Capabilities

```javascript
// Deploy TensorFlow Lite model
const modelPath = './models/anomaly_detection.tflite';
await edgeCompute.deployModel(modelPath, {
  input: { shape: [1, 10], type: 'float32' },
  output: { shape: [1, 2], type: 'float32' },
  preprocessing: 'normalize'
});

// Run inference
const result = await edgeCompute.runInference('anomaly_detection', sensorData);
```

### Edge Functions

```javascript
// Complex event processing
const cepFunction = `
  const events = [];
  
  return function(event) {
    events.push(event);
    
    // Keep last 100 events
    if (events.length > 100) events.shift();
    
    // Detect pattern
    const pattern = detectPattern(events);
    if (pattern) {
      return { alert: pattern.type, confidence: pattern.confidence };
    }
    
    return null;
  };
`;
```

## 🔒 Security

### Device Security
- **Authentication**: X.509 certificates, PSK
- **Encryption**: TLS/DTLS, AES-256
- **Secure boot**: Firmware verification
- **Secure element**: Hardware key storage

### Communication Security
- **Protocol encryption**: Per-protocol security
- **Message signing**: HMAC, digital signatures
- **Access control**: Device whitelisting
- **Rate limiting**: DDoS protection

### Data Security
- **At-rest encryption**: Local storage
- **In-transit encryption**: All protocols
- **Data anonymization**: PII removal
- **Audit logging**: All operations

## 📊 Monitoring & Analytics

### Real-time Metrics
```javascript
const metrics = await edgeGateway.getMetrics();
/*
{
  devices: {
    total: 150,
    online: 142,
    byProtocol: {
      mqtt: 89,
      coap: 23,
      modbus: 30
    }
  },
  messages: {
    rate: 1250, // msg/sec
    totalToday: 4500000
  },
  compute: {
    tasksRunning: 12,
    avgLatency: 23 // ms
  }
}
*/
```

### Device Health
```javascript
const health = await device.runDiagnostics();
/*
{
  connectivity: { signal: 85, latency: 12 },
  sensors: [{ id: 'temp', status: 'ok', lastReading: 23.5 }],
  power: { level: 78, estimatedLife: '14 days' },
  firmware: { version: '2.1.0', uptime: 345600 }
}
*/
```

## 🔄 Integration with Cloud

### Sync Configuration
```javascript
{
  cloud: {
    endpoint: 'https://api.workflow.com',
    syncInterval: 300, // seconds
    batchSize: 1000,
    compression: true
  },
  filtering: {
    rules: [
      { field: 'temperature', condition: 'change', threshold: 0.5 },
      { field: 'alert', condition: 'exists' }
    ]
  },
  buffering: {
    maxSize: 10000,
    maxAge: 3600 // seconds
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Device not connecting**
   - Check network connectivity
   - Verify credentials
   - Check protocol settings
   - Review firewall rules

2. **High latency**
   - Check edge compute load
   - Review data processing rules
   - Optimize aggregation windows
   - Consider edge scaling

3. **Data loss**
   - Enable store-and-forward
   - Increase buffer sizes
   - Check network stability
   - Review QoS settings

### Debug Mode

```bash
# Enable debug logging
export DEBUG=edge:*,iot:*

# Device simulator
npm run simulate:device -- --type sensor --protocol mqtt --count 10

# Protocol analyzer
npm run analyze:protocol -- --port 1883 --protocol mqtt
```

## 📚 Examples

### Smart Building
- Temperature control
- Occupancy detection
- Energy monitoring
- Security integration

### Industrial IoT
- Predictive maintenance
- Quality control
- Asset tracking
- Process optimization

### Smart Agriculture
- Soil monitoring
- Irrigation control
- Weather stations
- Crop health analysis

### Healthcare
- Patient monitoring
- Asset tracking
- Environmental control
- Equipment maintenance