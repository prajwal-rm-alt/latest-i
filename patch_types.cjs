const fs = require('fs');
let content = fs.readFileSync('types.ts', 'utf8');

content = content.replace(
  "export interface UserProfile {",
  "export interface UserProfile {\n  uid?: string;\n  userId?: string;"
);

content = content.replace(
  "export interface DailyReport {",
  "export interface DailyReport {\n  userId?: string;"
);

content = content.replace(
  "export interface StoreEODEntry {",
  "export interface StoreEODEntry {\n  userId?: string;"
);

content = content.replace(
  "export interface Complaint {",
  "export interface Complaint {\n  userId?: string;"
);

content = content.replace(
  "export interface AttendanceEntry {",
  "export interface AttendanceEntry {\n  userId?: string;"
);

content = content.replace(
  "export interface FollowUp {",
  "export interface FollowUp {\n  userId?: string;"
);

fs.writeFileSync('types.ts', content);
