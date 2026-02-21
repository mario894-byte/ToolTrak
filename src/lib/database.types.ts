export type Database = {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      tools: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          serial_number: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          status: 'available' | 'in_use' | 'maintenance' | 'retired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          status?: 'available' | 'in_use' | 'maintenance' | 'retired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          status?: 'available' | 'in_use' | 'maintenance' | 'retired';
          created_at?: string;
          updated_at?: string;
        };
      };
      tool_assignments: {
        Row: {
          id: string;
          tool_id: string;
          person_id: string | null;
          location_id: string | null;
          assigned_at: string;
          returned_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          person_id?: string | null;
          location_id?: string | null;
          assigned_at?: string;
          returned_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tool_id?: string;
          person_id?: string | null;
          location_id?: string | null;
          assigned_at?: string;
          returned_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
