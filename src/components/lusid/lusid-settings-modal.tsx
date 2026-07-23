'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  lusidApiService,
  ConnectionStatus,
} from '@/lib/services/lusid-api-service';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';

interface LusidSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

// Function to test basic connectivity to a URL without authentication
async function testBasicConnectivity(
  url: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch('/api/lusid/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return {
        success: false,
        message: data.message || data.error || 'Connection test failed',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection test failed',
    };
  }
}

export function LusidSettingsModal({
  isOpen,
  onClose,
  onSettingsSaved,
}: LusidSettingsModalProps) {
  const { toast } = useToast();
  const [baseUrl, setBaseUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testingStage, setTestingStage] = useState<
    'idle' | 'connecting' | 'authenticating'
  >('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    lusidApiService.getConnectionStatus()
  );

  useEffect(() => {
    // Load existing settings when modal opens
    if (isOpen) {
      // Clear any previous error
      setErrorMessage(null);

      const settings = lusidApiService.getSettings();
      if (settings) {
        setBaseUrl(settings.baseUrl);
        setAccessToken(settings.accessToken);
        setUserId(settings.userId || '');
      }

      // Update connection status
      setConnectionStatus(lusidApiService.getConnectionStatus());
    }
  }, [isOpen]);

  const handleSave = async () => {
    setErrorMessage(null);

    if (!baseUrl || !accessToken) {
      toast({
        title: 'Validation Error',
        description: 'Both environment URL and access token are required',
        variant: 'destructive',
      });
      return;
    }

    // Ensure URL has no trailing slash
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    setBaseUrl(cleanBaseUrl);

    setIsLoading(true);

    try {
      // First test basic connectivity without authentication
      setTestingStage('connecting');
      const connectivityTest = await testBasicConnectivity(cleanBaseUrl);

      if (!connectivityTest.success) {
        throw new Error(
          `Cannot connect to LUSID server: ${connectivityTest.message || 'Connection failed'}`
        );
      }

      // If connectivity test passed, try authenticating and fetching providers
      setTestingStage('authenticating');

      // Configure settings
      const settings = { baseUrl: cleanBaseUrl, accessToken, userId };
      lusidApiService.saveSettings(settings);

      // Test the connection by using the direct testConnection method that will fail fast on authentication errors
      await lusidApiService.testConnection();

      // If we got here, authentication was successful

      // Update connection status to connected
      setConnectionStatus('connected');

      // Show success toast
      toast({
        title: 'Settings Saved',
        description: 'LUSID connection configured successfully',
      });

      // Call the onSettingsSaved callback
      onSettingsSaved();

      // Close the modal
      onClose();
    } catch (error: any) {
      console.error('Failed to connect to LUSID:', error);

      // Extract the most useful error message
      let errorDetail = error.message || 'Unknown error';

      // Set detailed error message for display in the modal
      setErrorMessage(errorDetail);

      // Force update connection status to disconnected
      setConnectionStatus('disconnected');

      // Specific toast message based on the stage where the error occurred
      if (testingStage === 'connecting') {
        toast({
          title: 'Connection Failed',
          description:
            'Could not connect to the LUSID server. Please check the URL and your network connection.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication Failed',
          description:
            'Could not authenticate with LUSID using the provided credentials.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setTestingStage('idle');
    }
  };

  // Get status indicator color and label
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'text-green-500',
          label: 'Connected',
          icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        };
      case 'disconnected':
        return {
          color: 'text-red-500',
          label: 'Disconnected',
          icon: <AlertCircle className="mr-2 h-4 w-4" />,
        };
      default:
        return {
          color: 'text-gray-400',
          label: 'Status Unknown',
          icon: <AlertCircle className="mr-2 h-4 w-4" />,
        };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>LUSID Connection Settings</DialogTitle>
          <DialogDescription>
            Configure your connection to LUSID API services
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto py-4 pr-1">
          {/* Connection Status Indicator */}
          <div
            className={`flex items-center ${statusIndicator.color} mb-2 text-sm font-medium`}
          >
            {statusIndicator.icon}
            <span>Status: {statusIndicator.label}</span>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="flex items-start">
              <AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800">API Access Note</p>
                <p className="mt-1 text-amber-700">
                  This application communicates with the LUSID API through a
                  secure proxy. Make sure your LUSID environment allows API
                  access from SimpleFlow.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
              <div className="flex items-start">
                <AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Connection Error</p>
                  <p className="mt-1 text-red-700">{errorMessage}</p>
                  <div className="mt-2 text-xs text-red-700">
                    <p className="font-medium">Troubleshooting Tips:</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      <li>Verify your personal access token is valid</li>
                      <li>
                        Use the full base URL (e.g., https://example.lusid.com)
                      </li>
                      <li>Try with or without '/honeycomb' in the URL</li>
                      <li>
                        Check LUSID documentation for your environment's API
                        structure
                      </li>
                    </ul>
                  </div>
                  <a
                    href="https://www.lusid.com/docs/api/intro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center text-xs text-red-700 hover:underline"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Check LUSID API documentation
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseUrl" className="col-span-4">
              Environment URL
            </Label>
            <Input
              id="baseUrl"
              placeholder="https://example.lusid.com"
              className="col-span-4"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <div className="col-span-4 text-xs text-muted-foreground">
              Your LUSID environment URL (e.g., https://example.lusid.com)
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="col-span-4">
              Personal Access Token
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="Your LUSID personal access token"
              className="col-span-4"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="col-span-4 text-xs text-muted-foreground">
              Create a personal access token in your LUSID account settings
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userId" className="col-span-4">
              User ID
            </Label>
            <Input
              id="userId"
              type="password"
              placeholder="Your LUSID user identifier"
              className="col-span-4"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <div className="col-span-4 text-xs text-muted-foreground">
              Available in the footer of your LUSID settings menu
            </div>
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading
              ? testingStage === 'connecting'
                ? 'Testing Connection...'
                : 'Authenticating...'
              : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
