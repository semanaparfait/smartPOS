export interface RoleType {
  name: string;
  description: string;

}

export interface RoleResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
 
}