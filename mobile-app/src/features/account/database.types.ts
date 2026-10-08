import type { PlannerSnapshot } from '../home/home-session';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      planner_entities: {
        Row: { user_id: string; collection: string; entity_id: string; version: number; data: Json | null; is_deleted: boolean; change_id: number; created_at: string; updated_at: string; deleted_at: string | null; local_updated_at: string; server_updated_at: string; sync_status: 'synced' };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      planner_snapshots: {
        Row: { user_id: string; revision: number; snapshot: PlannerSnapshot; updated_at: string };
        Insert: { user_id: string; revision?: number; snapshot: PlannerSnapshot; updated_at?: string };
        Update: { revision?: number; snapshot?: PlannerSnapshot; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sync_planner_mutations: {
        Args: { p_cursor: number; p_limit: number; p_mutations: Json };
        Returns: Json;
      };
      save_planner_snapshot: {
        Args: { p_expected_revision: number; p_snapshot: PlannerSnapshot };
        Returns: Database['public']['Tables']['planner_snapshots']['Row'][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
