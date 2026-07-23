import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  FolderIcon,
  PlusIcon,
  XIcon,
  MoveIcon,
  FolderPlusIcon,
} from 'lucide-react';
import { useFavoriteScopes } from '@/contexts/favorite-scopes-context';
import { FavoriteScope } from '@/lib/services/scope-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
} from 'react-beautiful-dnd';

interface ManageScopesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageScopesModal({ isOpen, onClose }: ManageScopesModalProps) {
  const [newScope, setNewScope] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [scopesByFolder, setScopesByFolder] = useState<
    Record<string, FavoriteScope[]>
  >({});

  const {
    favoriteScopes,
    foldersWithScopes,
    addScope,
    removeScope,
    updateScopeFolder,
    refreshScopes,
  } = useFavoriteScopes();

  const { toast } = useToast();

  // Initialize folders and scopes when modal opens
  useEffect(() => {
    if (isOpen) {
      const folderNames = foldersWithScopes.map((folder) => folder.name);
      setFolders(folderNames);

      const scopeMap: Record<string, FavoriteScope[]> = {};
      foldersWithScopes.forEach((folder) => {
        scopeMap[folder.name] = folder.scopes;
      });
      setScopesByFolder(scopeMap);

      // Select the first folder by default if available
      if (folderNames.length > 0 && !selectedFolder) {
        setSelectedFolder(folderNames[0]);
      }
    }
  }, [isOpen, foldersWithScopes, selectedFolder]);

  const handleAddScope = async () => {
    if (!newScope.trim()) return;

    await addScope(newScope, selectedFolder);
    setNewScope('');
    toast({
      title: 'Scope added',
      description: `"${newScope}" has been added to your favorites.`,
    });
  };

  const handleAddFolder = async () => {
    if (!newFolder.trim()) return;

    // Check if folder already exists
    if (folders.includes(newFolder)) {
      toast({
        title: 'Folder already exists',
        description: 'Please use a different folder name.',
        variant: 'destructive',
      });
      return;
    }

    // Add folder to local state
    setFolders([...folders, newFolder]);
    setScopesByFolder({
      ...scopesByFolder,
      [newFolder]: [],
    });

    setSelectedFolder(newFolder);
    setNewFolder('');
    setIsAddingFolder(false);

    toast({
      title: 'Folder added',
      description: `"${newFolder}" folder has been created.`,
    });
  };

  const handleRemoveScope = async (scope: FavoriteScope) => {
    await removeScope(scope.id);

    // Update local state
    const updatedScopesByFolder = { ...scopesByFolder };
    const folderName = scope.folder || 'Uncategorized';
    updatedScopesByFolder[folderName] = updatedScopesByFolder[
      folderName
    ].filter((s) => s.id !== scope.id);
    setScopesByFolder(updatedScopesByFolder);

    toast({
      title: 'Scope removed',
      description: `"${scope.scope}" has been removed from your favorites.`,
    });
  };

  const handleRemoveFolder = async (folderName: string) => {
    if (folderName === 'Uncategorized') {
      toast({
        title: 'Cannot remove folder',
        description: 'The Uncategorized folder cannot be removed.',
        variant: 'destructive',
      });
      return;
    }

    // Move all scopes in this folder to Uncategorized
    const scopesToMove = scopesByFolder[folderName] || [];
    for (const scope of scopesToMove) {
      await updateScopeFolder(scope.id, null);
    }

    // Update local state
    const updatedFolders = folders.filter((f) => f !== folderName);
    setFolders(updatedFolders);

    const updatedScopesByFolder = { ...scopesByFolder };
    delete updatedScopesByFolder[folderName];
    setScopesByFolder(updatedScopesByFolder);

    // Select another folder
    if (selectedFolder === folderName) {
      setSelectedFolder(updatedFolders[0] || null);
    }

    toast({
      title: 'Folder removed',
      description: `"${folderName}" folder has been removed.`,
    });

    // Refresh scopes to ensure everything is in sync
    await refreshScopes();
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same folder at the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Get the scope that was dragged
    const sourceFolder = source.droppableId;
    const sourceScopes = scopesByFolder[sourceFolder] || [];
    const [movedScope] = sourceScopes.splice(source.index, 1);

    // Add the scope to the destination folder
    const destFolder = destination.droppableId;
    const destScopes = scopesByFolder[destFolder] || [];
    destScopes.splice(destination.index, 0, movedScope);

    // Update local state
    setScopesByFolder({
      ...scopesByFolder,
      [sourceFolder]: sourceScopes,
      [destFolder]: destScopes,
    });

    // Update the scope's folder in the database
    const newFolder = destFolder === 'Uncategorized' ? null : destFolder;
    await updateScopeFolder(movedScope.id, newFolder);

    toast({
      title: 'Scope moved',
      description: `"${movedScope.scope}" has been moved to "${destFolder}".`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Manage Favorite Scopes</DialogTitle>
          <DialogDescription>
            Organize your favorite scopes into folders for easy access
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-grow grid-cols-4 gap-4 overflow-hidden py-4">
          {/* Folders sidebar */}
          <div className="col-span-1 overflow-y-auto border-r pr-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Folders</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddingFolder(true)}
                className="h-6 w-6"
              >
                <FolderPlusIcon className="h-4 w-4" />
              </Button>
            </div>

            {isAddingFolder ? (
              <div className="mb-2 flex items-center space-x-2">
                <Input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Folder name"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddFolder();
                    } else if (e.key === 'Escape') {
                      setIsAddingFolder(false);
                      setNewFolder('');
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddingFolder(false);
                    setNewFolder('');
                  }}
                  className="h-6 w-6"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            ) : null}

            <ul className="space-y-1">
              {folders.map((folder) => (
                <li
                  key={folder}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-sm ${
                    selectedFolder === folder
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedFolder(folder)}
                >
                  <div className="flex items-center">
                    <FolderIcon className="mr-2 h-4 w-4" />
                    <span>{folder}</span>
                  </div>
                  {folder !== 'Uncategorized' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFolder(folder);
                      }}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Scopes content */}
          <div className="col-span-3 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {selectedFolder
                  ? `Scopes in ${selectedFolder}`
                  : 'Select a folder'}
              </h3>

              {selectedFolder && (
                <div className="flex items-center space-x-2">
                  <Input
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    placeholder="New scope"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddScope();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddScope}
                    disabled={!newScope.trim()}
                    className="h-8"
                  >
                    <PlusIcon className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
              )}
            </div>

            {selectedFolder && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-2">
                  {folders.map((folder) => (
                    <Droppable key={folder} droppableId={folder}>
                      {(
                        provided: DroppableProvided,
                        snapshot: DroppableStateSnapshot
                      ) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-md p-2 ${
                            snapshot.isDraggingOver ? 'bg-accent/50' : ''
                          } ${folder === selectedFolder ? '' : 'hidden'}`}
                        >
                          {(scopesByFolder[folder] || []).length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              No scopes in this folder
                            </p>
                          ) : (
                            (scopesByFolder[folder] || []).map(
                              (scope, index) => (
                                <Draggable
                                  key={scope.id}
                                  draggableId={scope.id}
                                  index={index}
                                >
                                  {(provided: DraggableProvided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="mb-1 flex items-center justify-between rounded-md border bg-background p-2"
                                    >
                                      <div className="flex items-center">
                                        <MoveIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>{scope.scope}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveScope(scope)}
                                        className="h-6 w-6"
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            )
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2 flex-shrink-0">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
