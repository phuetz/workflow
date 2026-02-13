import { useState, useEffect, useCallback } from 'react';
import { apiBuilderService, APIEndpoint, APIGateway, APIParameter } from '../../../services/APIBuilderService';
import { notificationService } from '../../../services/NotificationService';
import { logger } from '../../../services/SimpleLogger';
import { APIBuilderTab, EndpointFormData, DEFAULT_FORM_DATA } from './types';

export function useAPIBuilder(isOpen: boolean) {
  const [activeTab, setActiveTab] = useState<APIBuilderTab>('endpoints');
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [gateways, setGateways] = useState<APIGateway[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [isCreatingEndpoint, setIsCreatingEndpoint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<APIEndpoint>>(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [endpointsData, gatewaysData] = await Promise.all([
          apiBuilderService.getEndpoints(),
          apiBuilderService.getGateways()
        ]);

        if (!cancelled) {
          setEndpoints(endpointsData);
          setGateways(gatewaysData);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('Failed to load API data:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const addParameter = useCallback((type: 'headers' | 'queryParams') => {
    const newParam: APIParameter = {
      name: '',
      type: 'string',
      required: false,
      description: ''
    };

    setFormData(prev => ({
      ...prev,
      request: {
        ...prev.request!,
        [type]: [...(prev.request?.[type] || []), newParam]
      }
    }));
  }, []);

  const updateFormField = useCallback(<K extends keyof EndpointFormData>(
    field: K,
    value: EndpointFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (!formData.name || !formData.path) {
        notificationService.error('Validation Error', 'Please fill in all required fields');
        return;
      }

      if (selectedEndpoint) {
        await apiBuilderService.updateEndpoint(selectedEndpoint.id, formData);
        notificationService.success('Success', 'Endpoint updated successfully');
      } else {
        const { id, createdAt, updatedAt, ...endpointData } = formData as any;
        await apiBuilderService.createEndpoint(endpointData);
        notificationService.success('Success', 'Endpoint created successfully');
      }

      const endpointsData = await apiBuilderService.getEndpoints();
      setEndpoints(endpointsData);
      setIsCreatingEndpoint(false);
      setSelectedEndpoint(null);
    } catch (error) {
      logger.error('Failed to save endpoint:', error);
      notificationService.error('Error', 'Failed to save endpoint');
    }
  }, [formData, selectedEndpoint]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setIsCreatingEndpoint(false);
    setSelectedEndpoint(null);
  }, []);

  const editEndpoint = useCallback((endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setFormData(endpoint);
    setIsCreatingEndpoint(true);
  }, []);

  const createNewEndpoint = useCallback(() => {
    setSelectedEndpoint(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsCreatingEndpoint(true);
  }, []);

  return {
    // State
    activeTab,
    endpoints,
    gateways,
    selectedEndpoint,
    isCreatingEndpoint,
    isLoading,
    formData,

    // Actions
    setActiveTab,
    setSelectedEndpoint,
    setIsCreatingEndpoint,
    setFormData,
    addParameter,
    updateFormField,
    handleSave,
    resetForm,
    editEndpoint,
    createNewEndpoint
  };
}
