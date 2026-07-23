import { createClient } from '@/lib/supabase';

export interface FavoriteScope {
  id: string;
  scope: string;
  folder: string | null;
  created_at: string;
  last_used: string | null;
}

export interface FolderWithScopes {
  name: string;
  scopes: FavoriteScope[];
}

class ScopeService {
  async getFavoriteScopes(userId: string): Promise<FavoriteScope[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('favorite_scopes')
      .select('*')
      .eq('user_id', userId)
      .order('last_used', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching favorite scopes:', error);
      return [];
    }

    return data || [];
  }

  async addFavoriteScope(
    scope: string,
    userId: string,
    folder: string | null = null
  ): Promise<FavoriteScope | null> {
    const supabase = createClient();

    // Check if scope already exists for this user
    const { data: existingScopes } = await supabase
      .from('favorite_scopes')
      .select('*')
      .eq('scope', scope)
      .eq('user_id', userId);

    if (existingScopes && existingScopes.length > 0) {
      // Update last_used timestamp
      const { data, error } = await supabase
        .from('favorite_scopes')
        .update({ last_used: new Date().toISOString() })
        .eq('id', existingScopes[0].id)
        .select();

      if (error) {
        console.error('Error updating favorite scope:', error);
        return null;
      }

      return data?.[0] || null;
    }

    // Add new scope
    const { data, error } = await supabase
      .from('favorite_scopes')
      .insert([
        {
          scope,
          folder,
          user_id: userId,
          last_used: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error adding favorite scope:', error);
      return null;
    }

    return data?.[0] || null;
  }

  async removeFavoriteScope(id: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('favorite_scopes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing favorite scope:', error);
      return false;
    }

    return true;
  }

  async updateScopeFolder(
    id: string,
    folder: string | null
  ): Promise<FavoriteScope | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('favorite_scopes')
      .update({ folder })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating scope folder:', error);
      return null;
    }

    return data?.[0] || null;
  }

  async updateLastUsed(id: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('favorite_scopes')
      .update({ last_used: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating last used timestamp:', error);
      return false;
    }

    return true;
  }

  getFoldersWithScopes(scopes: FavoriteScope[]): FolderWithScopes[] {
    const folderMap = new Map<string, FavoriteScope[]>();

    // Group scopes by folder
    scopes.forEach((scope) => {
      const folderName = scope.folder || 'Uncategorized';
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)!.push(scope);
    });

    // Convert map to array of folder objects
    return Array.from(folderMap.entries()).map(([name, scopes]) => ({
      name,
      scopes,
    }));
  }

  filterScopesByText(
    scopes: FavoriteScope[],
    text: string,
    limit: number = 5
  ): FavoriteScope[] {
    if (!text) return [];

    const lowerText = text.toLowerCase();
    return scopes
      .filter((scope) => scope.scope.toLowerCase().includes(lowerText))
      .sort((a, b) => {
        // Sort by last_used (most recent first)
        if (a.last_used && b.last_used) {
          return (
            new Date(b.last_used).getTime() - new Date(a.last_used).getTime()
          );
        }
        if (a.last_used) return -1;
        if (b.last_used) return 1;
        return 0;
      })
      .slice(0, limit);
  }
}

export const scopeService = new ScopeService();
