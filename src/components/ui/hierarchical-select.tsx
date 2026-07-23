'use client';

import React, { useState } from 'react';
import { Button } from './button';
import {
  ChevronDown,
  ChevronRight,
  FolderIcon,
  FileIcon,
  Search,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  originalItem?: any;
}

// Function to build tree structure from flat list of dot-separated paths
export function buildTree(
  items: Array<{ TableName?: string; [key: string]: any }>
): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    isFolder: true,
    children: [],
  };

  items.forEach((item) => {
    // Skip items without TableName
    if (!item.TableName) return;

    const parts = item.TableName.split('.');
    let currentNode = root;

    // Process all parts except the last one as folders
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('.');

      // Find if this part already exists in current level
      let found = currentNode.children.find(
        (child) => child.name === part && child.isFolder === !isLastPart
      );

      if (!found) {
        // Create new node
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          isFolder: !isLastPart,
          children: [],
          // Only add the originalItem to leaf nodes
          ...(isLastPart && { originalItem: item }),
        };

        currentNode.children.push(newNode);
        currentNode = newNode;
      } else {
        currentNode = found;
      }
    }
  });

  // Sort nodes: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    return nodes.sort((a, b) => {
      // Folders come before files
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  // Recursively sort the tree
  const sortTree = (node: TreeNode) => {
    if (node.children.length > 0) {
      node.children = sortNodes(node.children);
      node.children.forEach(sortTree);
    }
    return node;
  };

  return sortTree(root);
}

interface HierarchicalSelectProps {
  items: Array<{ TableName?: string; [key: string]: any }>;
  value: string;
  onChange: (value: string, item?: any) => void;
  placeholder?: string;
  className?: string;
}

export function HierarchicalSelect({
  items,
  value,
  onChange,
  placeholder = 'Select an item',
  className,
}: HierarchicalSelectProps) {
  const [open, setOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Build tree from items
  const tree = React.useMemo(() => buildTree(items), [items]);

  // Find selected item - update to handle possibly undefined TableName
  const selectedItem = items.find((item) => item.TableName === value);

  // Toggle folder expansion
  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Auto-expand folders in the path of the selected item
  React.useEffect(() => {
    if (value) {
      const parts = value.split('.');
      const paths = parts.map((_, i) => parts.slice(0, i + 1).join('.'));

      // Remove the last path (the leaf node)
      if (paths.length > 0) {
        paths.pop();
      }

      setExpandedFolders(new Set(paths));
    }
  }, [value]);

  // Function to filter tree based on search query
  const filterTree = (node: TreeNode, query: string): boolean => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();

    // Check if this node matches
    const nodeMatches = node.path.toLowerCase().includes(lowerQuery);

    // If it's not a folder, just return whether it matches
    if (!node.isFolder) {
      return nodeMatches;
    }

    // For folders, also check if any children match
    let hasMatchingChildren = false;

    for (const child of node.children) {
      // Recursive call to check children
      const childMatches = filterTree(child, query);

      if (childMatches) {
        hasMatchingChildren = true;
      }
    }

    // A folder should be shown if it matches or has matching children
    return nodeMatches || hasMatchingChildren;
  };

  // Expand folders that contain matching items - separate from filterTree to avoid state updates during render
  React.useEffect(() => {
    if (!searchQuery) return;

    const expandMatchingFolders = (node: TreeNode, query: string): boolean => {
      if (!node.isFolder) return false;

      let shouldExpand = false;

      // Check if this folder name contains the query
      if (node.path.toLowerCase().includes(query.toLowerCase())) {
        shouldExpand = true;
      }

      // Check children recursively
      for (const child of node.children) {
        if (child.isFolder) {
          const childShouldExpand: boolean = expandMatchingFolders(
            child,
            query
          );
          shouldExpand = shouldExpand || childShouldExpand;
        } else if (child.path.toLowerCase().includes(query.toLowerCase())) {
          shouldExpand = true;
        }
      }

      // If this folder or any children match, expand it
      if (shouldExpand) {
        setExpandedFolders((prev) => {
          const newSet = new Set(Array.from(prev));
          newSet.add(node.path);
          return newSet;
        });
      }

      return shouldExpand;
    };

    // Process the tree
    for (const node of tree.children) {
      expandMatchingFolders(node, searchQuery);
    }
  }, [searchQuery, tree]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = e.target.value;
    setSearchQuery(newSearchValue);

    // If search is cleared, reset the expanded folders to only show the selection path
    if (!newSearchValue.trim()) {
      // Reset to showing only the selected path or nothing if no value is selected
      if (value) {
        const parts = value.split('.');
        const paths = parts.map((_, i) => parts.slice(0, i + 1).join('.'));

        if (paths.length > 0) {
          paths.pop(); // Remove the leaf node
        }

        setExpandedFolders(new Set(paths));
      } else {
        // If no value is selected, collapse all folders
        setExpandedFolders(new Set());
      }
    }
  };

  // Render tree node recursively
  const renderNode = (node: TreeNode, level = 0) => {
    // Skip if this node doesn't match the search query
    if (searchQuery && !filterTree(node, searchQuery)) {
      return null;
    }

    const isExpanded = expandedFolders.has(node.path);

    // Get description from original item if available
    const description = node.originalItem?.ProviderDescription || '';

    return (
      <div key={node.path} className="w-full">
        <TooltipProvider>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex cursor-pointer items-center rounded-sm px-2 py-1 hover:bg-accent',
                  node.isFolder ? 'font-medium' : '',
                  !node.isFolder && node.path === value ? 'bg-accent' : ''
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={
                  node.isFolder
                    ? (e) => toggleFolder(node.path, e)
                    : () => {
                        onChange(node.path, node.originalItem);
                        setOpen(false);
                      }
                }
              >
                {node.isFolder ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 h-4 w-4 p-0"
                      onClick={(e) => toggleFolder(node.path, e)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    <FolderIcon className="mr-2 h-4 w-4 text-amber-500" />
                    {node.name}
                  </>
                ) : (
                  <>
                    <div className="mr-1 w-4" />
                    <FileIcon className="mr-2 h-4 w-4 text-blue-500" />
                    <span className="truncate">{node.name}</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {!node.isFolder && description && (
              <TooltipContent side="right" className="max-w-xs bg-white">
                <p className="text-sm">{description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {node.isFolder && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between overflow-hidden', className)}
        >
          <span className="truncate">{selectedItem ? value : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex max-h-[350px] w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden bg-white p-2">
        <div className="relative mb-2">
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {tree.children.map((node) => renderNode(node))}
          {searchQuery &&
            tree.children.filter((node) => filterTree(node, searchQuery))
              .length === 0 && (
              <div className="py-4 text-center text-muted-foreground">
                No results found
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
