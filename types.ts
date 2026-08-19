export interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  customerPhone?: string;
  billId?: string;
  txnNumber?: string;
}

export interface DailyReport {
  userId?: string;
  date: string; // ISO format YYYY-MM-DD
  items: SaleItem[];
  totalValue: number;
  totalQty: number;
  billImages?: string[]; // Array of Base64 strings
  /** @deprecated use billImages instead */
  billImage?: string; 
  isWeekOff?: boolean;
  notes?: string;
}

export interface StoreEODEntry {
  userId?: string;
  date: string;
  achievement: number;
  eolAchieve: number;
  dayTarget: number;
  weekTarget: number;
  eolTarget: number;
}

export interface StoreLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface AttendanceEntry {
  userId?: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Week Off' | 'Leave';
  checkInTime?: string;
  location?: StoreLocation;
}

export interface UserProfile {
  uid?: string;
  userId?: string;
  name: string;
  employeeId: string;
  phoneNumber: string;
  email?: string;
  storeName: string;
  storeNameAndLocation?: string;
  storeCode?: string;
  tlName?: string;
  monthlyTarget: number;
  avatar?: string; // Base64
  apiKey?: string; // User provided API Key
  storeLocation?: StoreLocation;
  brandSiteUrl?: string;
  tollFreeNumber?: string;
  customTargets?: {
    daily: number;
    weekly: number;
    eol: number;
  };
}

export type ComplaintStatus = 'Raised' | 'In progress' | 'Technician assigned' | 'Resolved';

export interface ComplaintTimelineEvent {
  status: ComplaintStatus;
  date: string; // ISO string
  note?: string;
}

export interface Complaint {
  userId?: string;
  id: string;
  customerName: string;
  phoneNumber: string;
  productModel: string;
  issueType: 'Installation' | 'Complaint' | 'Store Stock' | 'Store Stack';
  customProductName?: string;
  status: ComplaintStatus;
  timeline: ComplaintTimelineEvent[];
  date: string;
  repairsDone?: string;
  partsReplaced?: string;
  /** @deprecated use status === 'Resolved' */
  isResolved?: boolean;
}

export interface FollowUp {
  userId?: string;
  id: string;
  customerName: string;
  phoneNumber: string;
  reminderDate: string; // YYYY-MM-DD
  note: string;
  isCompleted: boolean;
  createdAt: string;
}

export type Tab = 'dashboard' | 'attendance' | 'entry' | 'eod' | 'crm' | 'settings' | 'performance';