import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BookmarkIcon,
  ChevronDown,
  FolderIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  TagIcon,
  XIcon,
} from 'lucide-react';
import { useFavoriteScopes } from '@/contexts/favorite-scopes-context';
import { FavoriteScope } from '@/lib/services/scope-service';
import { cn } from '@/lib/utils';
import { ManageScopesModal } from '@/components/workflow/modals/manage-scopes-modal';

interface ScopeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ScopeInput({
  id,
  value,
  onChange,
  placeholder = 'Enter scope',
  label,
  className,
  disabled = false,
}: ScopeInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<FavoriteScope[]>([]);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const [showAddToFavorites, setShowAddToFavorites] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    favoriteScopes,
    foldersWithScopes,
    isLoading,
    addScope,
    removeScope,
    markScopeAsUsed,
    getSuggestions,
  } = useFavoriteScopes();

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Update suggestions when input value changes
  useEffect(() => {
    if (inputValue) {
      const matchingSuggestions = getSuggestions(inputValue);
      setSuggestions(matchingSuggestions);

      // Show suggestion dropdown if we have suggestions and input is focused
      setShowSuggestionDropdown(
        matchingSuggestions.length > 0 &&
          document.activeElement === inputRef.current
      );

      // Show "Add to favorites" option if value is not empty and not already in favorites
      const isInFavorites = favoriteScopes.some(
        (scope) => scope.scope.toLowerCase() === inputValue.toLowerCase()
      );
      setShowAddToFavorites(inputValue.trim() !== '' && !isInFavorites);
    } else {
      setSuggestions([]);
      setShowSuggestionDropdown(false);
      setShowAddToFavorites(false);
    }
  }, [inputValue, favoriteScopes, getSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectScope = (scope: string) => {
    setInputValue(scope);
    onChange(scope);
    setOpen(false);
    setShowSuggestionDropdown(false);

    // Find the scope in favorites and mark it as used
    const favoriteScope = favoriteScopes.find((fs) => fs.scope === scope);
    if (favoriteScope) {
      markScopeAsUsed(favoriteScope.id);
    }
  };

  const handleAddToFavorites = async () => {
    if (inputValue.trim()) {
      await addScope(inputValue.trim());
      setShowAddToFavorites(false);
    }
  };

  const handleRemoveScope = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeScope(id);
  };

  const handleOpenManageModal = () => {
    setIsManageModalOpen(true);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <div className="flex">
          <Input
            ref={inputRef}
            id={id}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn('pr-10', className)}
            disabled={disabled}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestionDropdown(true);
              }
            }}
            onBlur={() => {
              // Delay hiding the dropdown to allow for click events
              setTimeout(() => {
                setShowSuggestionDropdown(false);
              }, 200);
            }}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                disabled={disabled}
              >
                <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[300px] border bg-background p-0 shadow-md"
              align="end"
            >
              <Command>
                <CommandInput placeholder="Search scopes..." />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        Loading scopes...
                      </p>
                    ) : (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        No scopes found.
                      </p>
                    )}
                  </CommandEmpty>

                  {/* Suggestions based on current input */}
                  {suggestions.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((scope) => (
                        <CommandItem
                          key={scope.id}
                          value={scope.scope}
                          onSelect={() => handleSelectScope(scope.scope)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <TagIcon className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                            <span>{scope.scope}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleRemoveScope(e, scope.id)}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Folders with scopes */}
                  {foldersWithScopes.map((folder) => (
                    <CommandGroup key={folder.name}>
                      <Collapsible className="w-full">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1 text-sm font-medium">
                          <div className="flex items-center">
                            <FolderIcon className="mr-2 h-4 w-4" />
                            <span>{folder.name}</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {folder.scopes.map((scope) => (
                            <CommandItem
                              key={scope.id}
                              value={scope.scope}
                              onSelect={() => handleSelectScope(scope.scope)}
                              className="flex items-center justify-between pl-6"
                            >
                              <span>{scope.scope}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => handleRemoveScope(e, scope.id)}
                              >
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </CommandItem>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </CommandGroup>
                  ))}

                  {/* Add to favorites option */}
                  {showAddToFavorites && (
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleAddToFavorites}
                        className="flex items-center text-primary"
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        <span>Add "{inputValue}" to favorites</span>
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {/* Manage scopes button */}
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleOpenManageModal}
                      className="flex items-center"
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Manage Favorite Scopes</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestionDropdown && inputValue && !open && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md">
            <ul className="py-1">
              {suggestions.map((scope) => (
                <li
                  key={scope.id}
                  className="flex cursor-pointer items-center px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => handleSelectScope(scope.scope)}
                >
                  <TagIcon className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                  <span>{scope.scope}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Manage Scopes Modal */}
      <ManageScopesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </div>
  );
}
