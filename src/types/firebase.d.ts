
export type UserType = 'student' | 'lecturer' | 'admin' | 'courseRep' | '';
export type TransactionType = 'buy' | 'withdraw' | 'transfer' | 'admin-adjustment' | 'recieve';
export type UserRole = 'student' | 'lecturer' | 'admin';
export interface User {
  uid: string;
  usertype: UserType;
  firstname: string;
  lastname: string;
  isFirstLogin: boolean;
  schoolName: string;
  verificationToken?: string;
  email: string;
  communities?: string[];
  pointsBalance: number;
  staffId?: string;
  accessToken: string;
  ipAddress: string[];
  deviceType: string[]; 
  password: string;
  matricNumber?: string;
  department: string;
  profilePic?: string;
  hasSubscribed: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  twoFactorEnabled?: boolean;
  lastLogin?: FirebaseFirestore.Timestamp;
  phoneNumber?: string;
  country: string;
  badges?: string[];
  level?: number;
  assignedCourses?: string[];
  coursesEnrolled?: string[];
  isCourseRep?: boolean;
  appVersion?: string;
  isVerified?: boolean
}
export interface Community {
  id: string;
  name: string;
  description?: string;
  members: string[]; // user UIDs
  createdBy: string; // UID
  moderators: string[]; // UIDs of lecturers or admins
  createdAt: FirebaseFirestore.Timestamp;
}
export interface UserSettings {
  user: User;
  phoneLightingMode: 'dark' | 'light' | 'system-default';
  languagePreference?: string; // e.g., 'en', 'fr', 'ig'
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  calendarView?: 'monthly' | 'weekly' | 'daily';
  timeZone?: string; // e.g., 'Africa/Lagos'
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  relatedUserId?: string; // for transfers/receives
  relatedCommunityId?: string;
  timestamp: FirebaseFirestore.Timestamp;
}
export interface PollCandidate {
    id: string;
    userId: string;
    name: string;
    voteCount: number;
    profilePic?: string;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  allowedRolesToCreate?: UserRole[]; // restrict creation by role
  candidates: PollCandidate[];
  invitedUserIds: string[];
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp;
  isLive: boolean;
  liveComments?: string[];
  createdAt: FirebaseFirestore.Timestamp;
}

export interface PollVote {
  pollId: string;
  candidateId: string;
  voterId: string;
  timestamp: FirebaseFirestore.Timestamp;
}
export interface PollComment {
  pollId: string;
  userId: string;
  content: string;
  timestamp: FirebaseFirestore.Timestamp;
}
export interface ClassSession {
  id: string;
  hostId: string; // lecturer UID
  courseTitle: string;
  department: string;
  schoolName: string;
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp;
  isLive: boolean;
  allowAudioRecording: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  classCount?: number; 
  classHistory?: string[];
}
export interface RollCall {
  id: string;
  classSessionId: string;
  createdBy: string; // lecturer UID
  presentStudentIds: string[];
  exceptions: string[]; // subscriber UIDs allowed without joining
  createdAt: FirebaseFirestore.Timestamp;
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp;
  method?: 'manual' | 'auto' | 'none';
  manualScanDetails?: {
    imageUrls: string[];
    scannedAt: FirebaseFirestore.Timestamp;
  }
}
export interface AttendanceRecord {
  rollCallId: string;
  studentId: string;
  matricNumber: string;
  schoolName: string;
  courseTitle: string;
  attendedAt: FirebaseFirestore.Timestamp;
  isException: boolean;
  status?: 'present' | 'absent' | 'excused';
  notes?: string;
}
export interface AudioRecording {
  id: string;
  classSessionId: string;
  segments?: string[];
  recordedBy: string; // lecturer UID
  audioUrl: string;
  createdAt: FirebaseFirestore.Timestamp;
  duration?: number;
}
export interface Rating {
  userId: string;
  itemId: string;
  score: number; // e.g., 1 to 5
  comment?: string;
  ratedAt: FirebaseFirestore.Timestamp;
}
export interface Store {
  id: string;
  category: string[];
  listedProducts: MarketplaceItem[];
  createdAt: FirebaseFirestore.Timestamp;
}
export interface MarketplaceItem {
  id: string;
  isAvailable?: boolean;
  category: string;
  sellerId: string; // UID of lecturer or student
  title: string;
  description: string;
  mediaUrls: string[]; // images or videos
  type: 'product' | 'pdfFile';
  priceInPoints: number;
  lockedWithPassword?: boolean;
  password?: string; // only accessible after purchase
  createdAt: FirebaseFirestore.Timestamp;
  ratings: Rating[];
  tags?: string[];
}
export interface CartItem {
  userId: string;
  itemId: string;
  quantity: number;
  addedAt: FirebaseFirestore.Timestamp;
}
export interface Cart {
  userId: string;
  items: CartItem[];
  totalCartItemQuantity: number;
  addedAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}
export interface Refund {
  id: string;
  sellerId: string;
  buyerId: string;
  itemId: string;
  refundedAt: FirebaseFirestore.Timestamp;
  pointsRefunded: number;
  status?: 'successful' | 'cancelled';
}
export interface Purchase {
  id: string;
  sellerId: string;
  buyerId: string;
  itemId: string;
  purchasedAt: FirebaseFirestore.Timestamp;
  pointsUsed: number;
  unlockedPassword?: string; // if applicable
  status?: 'successful' | 'refunded' | 'cancelled';
}
export interface UserPointsAccount {
  userId: string;
  role: 'lecturer' | 'student';
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastTransaction?: PointsTransaction;
  purchases: Purchase[];
  refunds: Refund[];
  withdrawalHistory?: WithdrawalRequest[];
  buyHistory?: BuyRequest[];
  transferredPointsHistory?: TransferPointsRequest[];
  recievedPointsHistory?: RecievePointsRequest[];
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'; // optional gamification
}
export interface WithdrawalRequest {
  id: string;
  userId: string;
  pointsRequested: number;
  requestedAt: FirebaseFirestore.Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}
export interface BuyRequest {
  id: string;
  userId: string;
  pointsRequested: number;
  requestedAt: FirebaseFirestore.Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}
export interface TransferPointsRequest {
  id: string;
  fromId: string;
  toId: string;
  pointsRequested: number;
  requestedAt: FirebaseFirestore.Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}
export interface RecievePointsRequest {
  id: string;
  fromId: string;
  toId: string;
  pointsRequested: number;
  requestedAt: FirebaseFirestore.Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}
export interface CalendarEvent {
  id: string;
  createdBy: string; // UID of the user
  creatorRole: UserType;
  title: string;
  description?: string;
  courseTitle?: string; // for lecturer events
  department?: string; // for filtering visibility
  schoolName?: string;
  startDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  day?: string; // optional if using startDate/endDate
  lectureType?: 'online' | 'offline'; // for lecturer events
  attendanceType?: 'optional' | 'compulsory'; // for courseRep events
  visibility: 'private' | 'department' | 'public'; // controls who can see it
  createdAt: FirebaseFirestore.Timestamp;
}
export interface EventReminder {
  eventId: string;
  userId: string;
  reminderTime: FirebaseFirestore.Timestamp;
  event?: EventNote;
}
export interface EventNote {
  eventId: string;
  userId: string;
  content: string;
  timestamp: FirebaseFirestore.Timestamp;
  location?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  tags?: string[]; // e.g., ['exam', 'group meeting', 'revision']
}




