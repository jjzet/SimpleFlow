import React, { useState, useEffect } from 'react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { Button } from '@/components/ui/button';
import {
  Plus,
  User,
  Wand2,
  FileCode,
  Save,
  Code2,
  Settings,
  GitBranch,
  Rocket,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatUI } from '@/contexts/chat-ui-context';
import { Template } from '@/types/template';
import { LusidSettingsModal } from '@/components/lusid/lusid-settings-modal';
import { LusidDeploymentModal } from '../lusid/lusid-deployment-modal';
import {
  lusidApiService,
  ConnectionStatus,
  CONNECTION_STATUS_CHANGED_EVENT,
} from '@/lib/services/lusid-api-service';

// Create a custom event name for LUSID settings changes
export const LUSID_SETTINGS_CHANGED_EVENT = 'lusid-settings-changed';

// Helper to dispatch a global event when LUSID settings change
export const dispatchLusidSettingsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LUSID_SETTINGS_CHANGED_EVENT));
  }
};

interface WorkflowToolsMenuProps {
  onTemplatesClick: () => void;
  onSaveAsTemplateClick: () => void;
  onUpdateTemplateClick?: () => void;
  currentTemplate?: Template | null;
  isCodeView?: boolean;
}

export function WorkflowToolsMenu({
  onTemplatesClick,
  onSaveAsTemplateClick,
  onUpdateTemplateClick,
  currentTemplate,
  isCodeView = false,
}: WorkflowToolsMenuProps) {
  const { openChat } = useChatUI();
  const [isLusidSettingsOpen, setIsLusidSettingsOpen] = useState(false);
  const [isLusidDeploymentOpen, setIsLusidDeploymentOpen] = useState(false);
  const [lusidConnectionStatus, setLusidConnectionStatus] =
    useState<ConnectionStatus>(lusidApiService.getConnectionStatus());

  // Listen for connection status changes
  useEffect(() => {
    const handleConnectionStatusChange = (
      event: CustomEvent<{ status: ConnectionStatus }>
    ) => {
      setLusidConnectionStatus(event.detail.status);
    };

    window.addEventListener(
      CONNECTION_STATUS_CHANGED_EVENT,
      handleConnectionStatusChange as EventListener
    );

    return () => {
      window.removeEventListener(
        CONNECTION_STATUS_CHANGED_EVENT,
        handleConnectionStatusChange as EventListener
      );
    };
  }, []);

  const handleSettingsSaved = () => {
    // Dispatch global event that settings changed
    dispatchLusidSettingsChanged();
    setIsLusidSettingsOpen(false);
  };

  // Get status indicator color
  const getStatusIndicatorColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Hide the entire component if in code view
  if (isCodeView) return null;

  return (
    <div className="fixed right-20 top-4 z-50">
      <Menubar className="border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Templates menu - first position */}
        <MenubarMenu>
          <MenubarTrigger className="cursor-pointer">
            <FileCode className="mr-2 h-4 w-4" />
            Templates
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onTemplatesClick}>
              Browse Templates
              <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            {currentTemplate && onUpdateTemplateClick && (
              <>
                <MenubarItem onClick={onUpdateTemplateClick}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Template
                </MenubarItem>
                <MenubarSeparator />
              </>
            )}
            <MenubarItem onClick={onSaveAsTemplateClick}>
              Save as Template
              <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* AI Assistant menu - second position */}
        <MenubarMenu>
          <MenubarTrigger className="cursor-not-allowed opacity-50">
            <Wand2 className="mr-2 h-4 w-4" />
            AI Assistant
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem className="cursor-not-allowed opacity-50">
              Coming Soon
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Deploy menu - third position (new) */}
        <MenubarMenu>
          <MenubarTrigger className="cursor-pointer">
            <Rocket className="mr-2 h-4 w-4" />
            Deploy
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              className="cursor-pointer"
              onClick={() => setIsLusidDeploymentOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span>Deploy</span>
                <div
                  className={`ml-2 h-2 w-2 rounded-full ${getStatusIndicatorColor(lusidConnectionStatus)}`}
                ></div>
              </div>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Settings menu - fourth position */}
        <MenubarMenu>
          <MenubarTrigger className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => setIsLusidSettingsOpen(true)}
              className="flex items-center"
            >
              <div className="flex w-full items-center justify-between">
                <span>LUSID Connection</span>
                <div
                  className={`ml-2 h-2 w-2 rounded-full ${getStatusIndicatorColor(lusidConnectionStatus)}`}
                />
              </div>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* LUSID Settings Modal */}
      <LusidSettingsModal
        isOpen={isLusidSettingsOpen}
        onClose={() => setIsLusidSettingsOpen(false)}
        onSettingsSaved={handleSettingsSaved}
      />

      {/* LUSID Deployment Modal */}
      <LusidDeploymentModal
        isOpen={isLusidDeploymentOpen}
        onClose={() => setIsLusidDeploymentOpen(false)}
      />
    </div>
  );
}
