export type Role = 'Admin'|'Sales'|'Warehouse'|'Accounts';
export interface AuthUser { id:string; name:string; email:string; role:Role; }
