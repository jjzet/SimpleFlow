import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  FavoriteScope,
  FolderWithScopes,
  scopeService,
} from '@/lib/services/scope-service';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteScopesContextType {
  favoriteScopes: FavoriteScope[];
  foldersWithScopes: FolderWithScopes[];
  isLoading: boolean;
  addScope: (
    scope: string,
    folder?: string | null
  ) => Promise<FavoriteScope | null>;
  removeScope: (id: string) => Promise<boolean>;
  updateScopeFolder: (
    id: string,
    folder: string | null
  ) => Promise<FavoriteScope | null>;
  markScopeAsUsed: (id: string) => Promise<boolean>;
  getSuggestions: (text: string, limit?: number) => FavoriteScope[];
  refreshScopes: () => Promise<void>;
}

const FavoriteScopesContext = createContext<
  FavoriteScopesContextType | undefined
>(undefined);

export function useFavoriteScopes() {
  const context = useContext(FavoriteScopesContext);
  if (context === undefined) {
    throw new Error(
      'useFavoriteScopes must be used within a FavoriteScopesProvider'
    );
  }
  return context;
}

interface FavoriteScopesProviderProps {
  children: ReactNode;
}

export function FavoriteScopesProvider({
  children,
}: FavoriteScopesProviderProps) {
  const [favoriteScopes, setFavoriteScopes] = useState<FavoriteScope[]>([]);
  const [foldersWithScopes, setFoldersWithScopes] = useState<
    FolderWithScopes[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const refreshScopes = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const scopes = await scopeService.getFavoriteScopes(user.id);
      setFavoriteScopes(scopes);
      setFoldersWithScopes(scopeService.getFoldersWithScopes(scopes));
    } catch (error) {
      console.error('Error fetching favorite scopes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load favorite scopes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshScopes();
  }, [user?.id]);

  const addScope = async (scope: string, folder: string | null = null) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add favorite scopes',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const newScope = await scopeService.addFavoriteScope(
        scope,
        user.id,
        folder
      );
      if (newScope) {
        await refreshScopes();
        return newScope;
      }
      return null;
    } catch (error) {
      console.error('Error adding favorite scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to add favorite scope',
        variant: 'destructive',
      });
      return null;
    }
  };

  const removeScope = async (id: string) => {
    try {
      const success = await scopeService.removeFavoriteScope(id);
      if (success) {
        await refreshScopes();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing favorite scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove favorite scope',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateScopeFolder = async (id: string, folder: string | null) => {
    try {
      const updatedScope = await scopeService.updateScopeFolder(id, folder);
      if (updatedScope) {
        await refreshScopes();
        return updatedScope;
      }
      return null;
    } catch (error) {
      console.error('Error updating scope folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scope folder',
        variant: 'destructive',
      });
      return null;
    }
  };

  const markScopeAsUsed = async (id: string) => {
    try {
      const success = await scopeService.updateLastUsed(id);
      if (success) {
        // No need to refresh all scopes, just update the local state
        setFavoriteScopes((prevScopes) => {
          const updatedScopes = prevScopes.map((scope) => {
            if (scope.id === id) {
              return { ...scope, last_used: new Date().toISOString() };
            }
            return scope;
          });
          return updatedScopes;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking scope as used:', error);
      return false;
    }
  };

  const getSuggestions = (text: string, limit: number = 5) => {
    return scopeService.filterScopesByText(favoriteScopes, text, limit);
  };

  const value = {
    favoriteScopes,
    foldersWithScopes,
    isLoading,
    addScope,
    removeScope,
    updateScopeFolder,
    markScopeAsUsed,
    getSuggestions,
    refreshScopes,
  };

  return (
    <FavoriteScopesContext.Provider value={value}>
      {children}
    </FavoriteScopesContext.Provider>
  );
}
