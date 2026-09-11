declare module 'node-sql-parser/build/mysql' {
  import { Parser } from 'node-sql-parser';
  const mysql: { Parser: typeof Parser };
  export default mysql;
}
