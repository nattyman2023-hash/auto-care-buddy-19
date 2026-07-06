// Hostinger Database API client - Browser-compatible
// This replaces the Supabase client for database operations
// by making HTTP requests to the API backend

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function apiRequest(table: string, action: string, params: any = {}) {
  try {
    const response = await fetch(`${API_BASE}/db/${table}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// Export a compatible interface that matches Supabase client usage
export const db = {
  from: (table: string) => ({
    select: async (columns: string = '*') => {
      return apiRequest(table, 'select', { columns });
    },
    insert: async (values: any | any[]) => {
      return apiRequest(table, 'insert', { values: Array.isArray(values) ? values : [values] });
    },
    update: async (values: any) => {
      return apiRequest(table, 'update', { values });
    },
    delete: async () => {
      return apiRequest(table, 'delete', {});
    },
    eq: async (column: string, value: any) => {
      return apiRequest(table, 'eq', { column, value });
    },
    single: async () => {
      return apiRequest(table, 'single', {});
    },
    order: (column: string, direction: 'asc' | 'desc' = 'asc') => {
      return {
        select: async (columns: string = '*') => {
          return apiRequest(table, 'select', { columns, order_by: column, order_dir: direction });
        }
      };
    },
    limit: (limit: number) => {
      return {
        select: async (columns: string = '*') => {
          return apiRequest(table, 'select', { columns, limit });
        }
      };
    }
  }),
  
  // Authentication compatibility (placeholder for JWT implementation)
  auth: {
    signUp: async (credentials: { email: string; password: string }) => {
      return apiRequest('auth', 'signup', credentials);
    },
    signIn: async (credentials: { email: string; password: string }) => {
      return apiRequest('auth', 'signin', credentials);
    },
    signOut: async () => {
      return apiRequest('auth', 'signout', {});
    },
    onAuthStateChange: () => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  }
};
