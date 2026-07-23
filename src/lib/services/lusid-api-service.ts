interface LusidSettings {
  baseUrl: string;
  accessToken: string;
  userId?: string;
}

// Define a provider interface to match the LUSID API response
export interface LusidProvider {
  TableName?: string;
  ProviderDescription?: string;
  DocumentationLink?: string;
  IsView?: boolean;
  FieldCount?: number;
  [key: string]: any; // Allow for other properties
}

// Define a field interface to match the LUSID fields API response
export interface LusidField {
  TableName: string;
  FieldName: string;
  DataType: string;
  FieldType: string;
  IsPrimaryKey?: number;
  IsMain?: number;
  Description?: string;
  ParamDefaultValue?: string | null;
  TableParamColumns?: string | null;
  [key: string]: any; // Allow for other properties
}

// Connection status type
export type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';

// Event name for connection status changes
export const CONNECTION_STATUS_CHANGED_EVENT =
  'lusid-connection-status-changed';

// Event name for providers list changes
export const PROVIDERS_CHANGED_EVENT = 'lusid-providers-changed';

class LusidApiService {
  private settings: LusidSettings | null = null;
  private connectionStatus: ConnectionStatus = 'unknown';
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 180000; // 3 minutes
  // Store providers cache
  private cachedProviders: LusidProvider[] = [];
  // Add an event name for provider list changes
  private static readonly PROVIDERS_CHANGED_EVENT = PROVIDERS_CHANGED_EVENT;
  // Flag to track if an aggregation is in progress
  private isAggregatingProviders = false;
  // Number of requests to make when aggregating
  private readonly AGGREGATION_REQUESTS = 3;
  // Delay between requests in ms
  private readonly AGGREGATION_DELAY_MS = 300;

  constructor() {
    // Try to load settings from localStorage
    this.loadSettings();

    // Start periodic connection check if settings exist
    if (this.settings) {
      this.startConnectionCheck();
    }
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('lusid_settings');
      if (savedSettings) {
        try {
          this.settings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse saved LUSID settings:', e);
          localStorage.removeItem('lusid_settings');
        }
      }
    }
  }

  saveSettings(settings: LusidSettings) {
    this.settings = settings;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lusid_settings', JSON.stringify(settings));
    }

    // Start connection checks with new settings
    this.startConnectionCheck();
  }

  clearSettings() {
    this.settings = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lusid_settings');
    }

    // Stop connection checks
    this.stopConnectionCheck();

    // Update status to disconnected
    this.updateConnectionStatus('disconnected');
  }

  getSettings(): LusidSettings | null {
    return this.settings;
  }

  hasSettings(): boolean {
    return !!this.settings;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  private updateConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;

      // Dispatch event about status change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(CONNECTION_STATUS_CHANGED_EVENT, {
            detail: { status },
          })
        );
      }
    }
  }

  private startConnectionCheck() {
    // Clear any existing interval
    this.stopConnectionCheck();

    // Perform an immediate check
    this.checkConnection();

    // Set up interval for periodic checks
    if (typeof window !== 'undefined') {
      this.connectionCheckInterval = setInterval(() => {
        this.checkConnection();
      }, this.CHECK_INTERVAL_MS);
    }
  }

  private stopConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  private async checkConnection() {
    if (!this.settings) {
      this.updateConnectionStatus('disconnected');
      return;
    }

    try {
      // Make a lightweight call to check connection
      // Use aggregateProviders with isConnectionTest=false since this is just a periodic check
      await this.aggregateProviders(false);
      this.updateConnectionStatus('connected');
    } catch (error) {
      console.error('LUSID connection check failed:', error);
      this.updateConnectionStatus('disconnected');
    }
  }

  async fetchProviders(): Promise<LusidProvider[]> {
    if (!this.settings) {
      throw new Error('LUSID settings not configured');
    }

    try {
      // Log the request for debugging (without exposing tokens)
      console.log(
        `Fetching LUSID providers from ${this.settings.baseUrl}/honeycomb/api/Catalog/providers via proxy`
      );

      // Add cache busting query parameter using timestamp
      const cacheBuster = `_cb=${Date.now()}`;

      // Use our Next.js API route as a proxy instead of directly calling LUSID
      const response = await fetch(`/api/lusid/providers?${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify({
          baseUrl: this.settings.baseUrl,
          accessToken: this.settings.accessToken,
          cacheBust: Date.now(), // Add cache busting value in the body too
        }),
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        let details = '';

        try {
          const errorData = await response.json();
          details =
            errorData.message || errorData.error || errorData.details || '';
          if (details) {
            errorMessage += ` - ${details}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        // Update connection status on API failure
        this.updateConnectionStatus('disconnected');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('LUSID providers fetched successfully');

      // Process the response data to ensure valid providers
      let providers: LusidProvider[] = [];

      if (Array.isArray(data.providers)) {
        providers = data.providers;
      } else if (Array.isArray(data)) {
        providers = data;
      } else if (typeof data === 'object') {
        // Try to find array properties that might contain providers
        const arrayProps = Object.entries(data).filter(
          ([_, v]) => Array.isArray(v) && v.length > 0
        );

        if (arrayProps.length > 0) {
          // Use the largest array
          const likelyProvidersProp = arrayProps.sort(
            (a, b) => (b[1] as any[]).length - (a[1] as any[]).length
          )[0][0];
          providers = data[likelyProvidersProp] || [];
        }
      }

      console.log(`LUSID API returned ${providers.length} providers`);

      // Ensure providers is always an array of objects
      const normalizedProviders = providers.map((provider) => {
        if (typeof provider === 'string') {
          return { TableName: provider };
        }
        return provider;
      });

      // Update the cached providers with append-only approach
      this.updateCachedProviders(normalizedProviders);

      // Update connection status on success
      this.updateConnectionStatus('connected');

      // Return the cached providers (which now includes the new ones)
      return this.cachedProviders;
    } catch (error) {
      console.error('Error fetching LUSID providers:', error);
      // Update connection status on error
      this.updateConnectionStatus('disconnected');
      throw error;
    }
  }

  /**
   * Test connection to LUSID API with a single request.
   * Designed for validating credentials without retry logic.
   * Will fail immediately on any error.
   * @returns True if connection is successful
   * @throws Error if connection fails for any reason
   */
  async testConnection(): Promise<boolean> {
    if (!this.settings) {
      throw new Error('LUSID settings not configured');
    }

    try {
      // Log the request for debugging (without exposing tokens)
      console.log(
        `Testing LUSID connection to ${this.settings.baseUrl} via proxy`
      );

      // Add cache busting query parameter using timestamp
      const cacheBuster = `_cb=${Date.now()}`;

      // Use our Next.js API route as a proxy instead of directly calling LUSID directly
      const response = await fetch(`/api/lusid/providers?${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify({
          baseUrl: this.settings.baseUrl,
          accessToken: this.settings.accessToken,
          cacheBust: Date.now(), // Add cache busting value in the body too
        }),
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        let details = '';

        try {
          const errorData = await response.json();
          details =
            errorData.message || errorData.error || errorData.details || '';
          if (details) {
            errorMessage += ` - ${details}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        // Update connection status on API failure
        this.updateConnectionStatus('disconnected');
        throw new Error(errorMessage);
      }

      // If we get here, the request was successful
      this.updateConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('LUSID connection test failed:', error);
      // Update connection status on error
      this.updateConnectionStatus('disconnected');
      throw error;
    }
  }

  // Add a method to get the cached providers
  getCachedProviders(): LusidProvider[] {
    return this.cachedProviders;
  }

  // New method to update cached providers with append-only approach
  private updateCachedProviders(newProviders: LusidProvider[]) {
    // Create a lookup of existing providers
    const existingProvidersMap = this.cachedProviders.reduce(
      (map, provider) => {
        if (provider.TableName) {
          map[provider.TableName] = provider;
        }
        return map;
      },
      {} as Record<string, LusidProvider>
    );

    let hasNewProviders = false;

    // Add any new providers to our cache
    newProviders.forEach((provider) => {
      if (provider.TableName && !existingProvidersMap[provider.TableName]) {
        this.cachedProviders.push(provider);
        hasNewProviders = true;
      }
    });

    // Only dispatch event if we added new providers
    if (hasNewProviders) {
      this.dispatchProvidersChangedEvent();
    }
  }

  // Method to dispatch the providers changed event
  private dispatchProvidersChangedEvent() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(PROVIDERS_CHANGED_EVENT, {
          detail: { providers: this.cachedProviders },
        })
      );
    }
  }

  // New method to fetch providers multiple times and aggregate them
  async aggregateProviders(
    isConnectionTest: boolean = false
  ): Promise<LusidProvider[]> {
    // If already aggregating, return the current cached providers
    if (this.isAggregatingProviders) {
      return this.cachedProviders;
    }

    try {
      this.isAggregatingProviders = true;

      // Make multiple API calls with short delays to hit different cache nodes
      let successfulRequests = 0;
      let lastError: Error | null = null;

      for (let i = 0; i < this.AGGREGATION_REQUESTS; i++) {
        try {
          await this.fetchProviders();
          successfulRequests++;

          // If this is a connection test and we got a successful request, we can return early
          if (isConnectionTest && successfulRequests > 0) {
            this.updateConnectionStatus('connected');
            return this.cachedProviders;
          }

          // Skip delay on last iteration
          if (i < this.AGGREGATION_REQUESTS - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.AGGREGATION_DELAY_MS)
            );
          }
        } catch (error: any) {
          console.error(
            `Error on provider aggregation request ${i + 1}:`,
            error
          );
          lastError = error;

          // If this is a connection test, fail immediately on authentication errors
          if (
            isConnectionTest &&
            error.message &&
            (error.message.includes('401') ||
              error.message.includes('403') ||
              error.message.includes('Authentication') ||
              error.message.includes('Unauthorized') ||
              error.message.includes('Forbidden'))
          ) {
            this.updateConnectionStatus('disconnected');
            throw new Error(`Authentication failed: ${error.message}`);
          }

          // Continue with next request even if this one failed
        }
      }

      // If at least one request was successful, update status to connected
      if (successfulRequests > 0) {
        this.updateConnectionStatus('connected');
      } else {
        // If all requests failed, update status to disconnected
        this.updateConnectionStatus('disconnected');
        // Throw an error to indicate the aggregation failed
        if (lastError) {
          throw lastError; // Re-throw the last error we received
        } else {
          throw new Error(
            'Failed to connect to LUSID API. All requests failed.'
          );
        }
      }

      return this.cachedProviders;
    } finally {
      this.isAggregatingProviders = false;
    }
  }

  // Add a method to get the providers changed event name
  static getProvidersChangedEventName(): string {
    return LusidApiService.PROVIDERS_CHANGED_EVENT;
  }

  async fetchFields(tableName: string): Promise<LusidField[]> {
    if (!this.settings) {
      throw new Error('LUSID settings not configured');
    }

    if (!tableName) {
      throw new Error('Table name is required to fetch fields');
    }

    try {
      // Log the request for debugging (without exposing tokens)
      console.log(`Fetching LUSID fields for ${tableName} via proxy`);

      // Add cache busting query parameter
      const cacheBuster = `_cb=${Date.now()}`;

      // Use our Next.js API route as a proxy
      const response = await fetch(`/api/lusid/fields?${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify({
          baseUrl: this.settings.baseUrl,
          accessToken: this.settings.accessToken,
          tableName,
          cacheBust: Date.now(), // Add cache busting value in the body too
        }),
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        let details = '';

        try {
          const errorData = await response.json();
          details =
            errorData.message || errorData.error || errorData.details || '';
          if (details) {
            errorMessage += ` - ${details}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('LUSID fields fetched successfully');

      // Process the response data to ensure valid fields
      let fields: LusidField[] = [];

      if (Array.isArray(data.fields)) {
        fields = data.fields;
      } else if (Array.isArray(data)) {
        fields = data;
      } else if (typeof data === 'object') {
        // Try to find array properties that might contain fields
        const arrayProps = Object.entries(data).filter(
          ([_, v]) => Array.isArray(v) && v.length > 0
        );

        if (arrayProps.length > 0) {
          // Use the largest array
          const likelyFieldsProp = arrayProps.sort(
            (a, b) => (b[1] as any[]).length - (a[1] as any[]).length
          )[0][0];
          fields = data[likelyFieldsProp] || [];
        }
      }

      console.log(
        `LUSID API returned ${fields.length} fields for ${tableName}`
      );

      // Update connection status on success
      this.updateConnectionStatus('connected');

      return fields;
    } catch (error) {
      console.error(`Error fetching LUSID fields for ${tableName}:`, error);
      // Update connection status on error
      this.updateConnectionStatus('disconnected');
      throw error;
    }
  }
}

// Export a singleton instance
export const lusidApiService = new LusidApiService();
