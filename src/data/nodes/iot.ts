import { NodeType } from '../../types/workflow';

export const IOT_NODES: Record<string, NodeType> = {
  arduino: { type: 'arduino', label: 'Arduino', icon: 'Cpu', color: 'bg-teal-600', category: 'iot', inputs: 1, outputs: 1, description: 'Hardware platform' },
    raspberrypi: { type: 'raspberrypi', label: 'Raspberry Pi', icon: 'Cpu', color: 'bg-red-600', category: 'iot', inputs: 1, outputs: 1, description: 'Single-board computer' },
  particle: { type: 'particle', label: 'Particle', icon: 'Wifi', color: 'bg-blue-600', category: 'iot', inputs: 1, outputs: 1, description: 'IoT platform' },
    adafruitio: { type: 'adafruitio', label: 'Adafruit IO', icon: 'Cpu', color: 'bg-black', category: 'iot', inputs: 1, outputs: 1, description: 'IoT platform' },
  thingspeak: { type: 'thingspeak', label: 'ThingSpeak', icon: 'Radio', color: 'bg-blue-600', category: 'iot', inputs: 1, outputs: 1, description: 'IoT analytics' },
    losant: { type: 'losant', label: 'Losant', icon: 'Wifi', color: 'bg-orange-600', category: 'iot', inputs: 1, outputs: 1, description: 'IoT platform' },
  awsiot: { type: 'awsiot', label: 'AWS IoT', icon: 'Wifi', color: 'bg-orange-600', category: 'iot', inputs: 1, outputs: 1, description: 'AWS IoT Core' },
    azureiothub: { type: 'azureiothub', label: 'Azure IoT Hub', icon: 'Wifi', color: 'bg-blue-700', category: 'iot', inputs: 1, outputs: 1, description: 'IoT messaging' },
  googlecloudiot: { type: 'googlecloudiot', label: 'Google Cloud IoT', icon: 'Wifi', color: 'bg-blue-600', category: 'iot', inputs: 1, outputs: 1, description: 'IoT Core' },
    ubidots: { type: 'ubidots', label: 'Ubidots', icon: 'Activity', color: 'bg-green-600', category: 'iot', inputs: 1, outputs: 1, description: 'IoT platform' }
};
