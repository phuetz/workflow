// Type declarations for optional database drivers
declare module 'pg' {
  const pg: any;
  export = pg;
}

declare module 'mysql2/promise' {
  const mysql: any;
  export = mysql;
}
