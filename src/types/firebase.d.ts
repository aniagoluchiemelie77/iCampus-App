
export type UserType = 'student' | 'lecturer' | 'admin' | '';
export type TransactionType = 'buy' | 'withdraw' | 'transfer' | 'recieve';
export type PurchaseTransactionType = 'pending' | 'successful' | 'rejected';
export type UserRole = 'student' | 'lecturer' | 'admin';
export interface User {
  uid: string;
  refreshTokens?: string[];
  usertype: UserType;
  firstname: string;
  lastname: string;
  isFirstLogin?: boolean;
  schoolName?: string;
  verificationToken?: string;
  email: string;
  communitiesId?: Community.communitiesId[];
  pointsBalance: UserPointsAccount.currentBalance;
  staffId?: string;
  accessToken: string;
  ipAddress?: string[];
  deviceType?: string[]; 
  password: string;
  matricNumber?: string;
  department: string;
  profilePic?: string[];
  hasSubscribed: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  phoneNumber?: string;
  country: string;
  badges?: string[];
  schoolCode?: string;
  current_level?: string;
  coursesEnrolled?: Course.courseId[];
  isCourseRep?: boolean;
  appVersion?: iCampusAppDetails.appVersion;
  isVerified?: boolean
  userToken?: string,
  tokenCreatedAt?: string,
  coursesTeaching?: Course.courseId[];
  pointsAccountId?: UserPointsAccount.pointsAccountId,
  cart?: string[];
  favorites?: string[];
  phone_number?: string
  purchaseHistory?: PurchaseHistory[];
  PurchaseTransactions?: UserTransactions[];
  deals?: Deals.dealId[];
  userAccountDetails?: UserBankOrCardDetails.cardOrBankDetailsId[];
  secondSemesterUnits?: string,
  firstSemesterUnits?: string,
  iScore?: string
}
export interface iCampusAppDetails {
  appVersion: string;// e.g., ['tech', 'sports', 'arts']
}
export interface Community {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  members: User.uid[]; // user UIDs
  createdBy: string; // UID
  moderators: string[]; // UIDs of lecturers or admins
  createdAt: string;
  membersCount: number;
  isPublic?: boolean;
  schoolName: string;
  department?: string; // optional
  level?: string; // optional
  tags?: string[]; // e.g., ['tech', 'sports', 'arts']
}
export interface Notification {
  id: string;
  notificationId: string;
  userId?: User.uid; // recipient UID
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedCommunityId?: Community.communityId; // if related to a community
  relatedEventId?: CalendarEvent.id; // if related to an event
  relatedPollId?: Poll.pollId; // if related to a poll
  relatedClassSessionId?: ClassSession.classSessionId; // if related to a class session
  isPublic?: boolean;
  relatedSchoolName: User.schoolName;
  department?: string; // optional
  level?: string; // optional
  type?: string;
  status?: string;
  transactionIdMid?: string;
  fileUrls?: string[] 
}
export interface UserSettings {
  userId: User.uid;
  phoneLightingMode?: 'dark' | 'light' | 'system-default';
  languagePreference?: string; // e.g., 'en', 'fr', 'ig'
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  calendarView?: 'monthly' | 'weekly' | 'daily';
  timeZone?: string; // e.g., 'Africa/Lagos'
  updatedAt: string;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  relatedUserId?: string; // for transfers/receives
  relatedCommunityId?: string;
  timestamp: string;
}
export interface PollCandidate {
    id: string;
    userId: string;
    firstname: string;
    lastname: string;
    candidatePostTarget: string;
    voteCount: number;
    profilePic?: string;
}

export interface Poll {
  id: string;
  pollId: string;
  title: string;
  creatorId: string;
  allowedRolesToCreate?: UserRole[]; // restrict creation by role
  candidates: PollCandidate[];
  invitedUserIds: string[];
  startDate: string;
  endDate: string;
  totalVotes: number;
  department?: string; // if visibility is 'department'
  restriction?: string; // optional
  level?: string; // optional
  createdByRole: UserRole;
  pollStartTime: string;
  pollEndTime: string;
  isLive: boolean;
  liveComments?: string[];
  createdAt: string;
}

export interface PollVote {
  pollId: Poll.pollId;
  candidateId: PollCandidate.userId;
  voterId: User.uid;
  timestamp: string;
}
export interface PollComment {
  id: string;
  pollId: Poll.pollId;
  voterId: User.uid;
  content: string;
  timestamp: string;
}
export interface ClassSession {
  id: string;
  classSessionId: string;
  hostId: User.uid; // lecturer UID
  courseTitle: string;
  level: string;
  classVenue: string;
  courseCode: string;
  department: string;
  schoolName: string;
  classStartTime: string;
  classEndTime: string;
  isLive?: boolean;
  allowAudioRecording?: boolean;
  createdAt: string;
  classCount?: number; 
  classHistory?: string[];
  attendeesCount: number; 
  classSessionType?: 'lecture' | 'tutorial' | 'lab' | 'seminar' | 'workshop' | 'other';
}
export interface RollCall {
  id: string;
  rollCallId: string;
  classSessionId: ClassSession.classSessionId;
  createdBy: User.uid; // lecturer UID
  attendeeIds: string[];
  exceptions?: string[]; // subscriber UIDs allowed without joining
  createdAt: string;
  rollCallStartTime: string;
  rollCallEndTime: string;
  rollCallMethod?: 'manual' | 'auto';
  manualScanDetails?: {
    imageUrls: string[];
    scannedAt: string;
  }
}
export interface ClassExceptions {
  id: string;
  userId: User.uid;
  classSessionId: ClassSession.classSessionId;
  isAccepted?: boolean;
  requestedAt: string;
  reviewedAt?: string;
  exceptionReason?: string;
}
export interface AttendanceRecordClassSession {
  rollCallId: RollCall.rollCallId;
  studentsId: User.uid[];
  attendeesMatricNumber: User.matricNumber[];
  schoolName: string;
  courseTitle: string;
  courseCode: string;
  level: string;
  department: string;
  classSessionId: ClassSession.classSessionId;
  classDuration?: string;
  lecturerId: User.uid; // lecturer UID
  classStartTime: ClassSession.classStartTime;
  classEndTime: ClassSession.classEndTime;
  classVenue: ClassSession.classVenue;
  hasExceptions?: boolean;
  exceptionsCount?: number;
  exceptionsUserIds?: ClassExceptions.userId[];
}
export interface AudioRecording {
  id: string;
  audioRecordingId: string;
  classSessionId: ClassSession.classSessionId;
  segments?: string[];
  recordedBy: User.uid; // lecturer UID
  audioUrl: string;
  createdAt: string;
  duration?: string;
}
export interface Rating {
  id: string;
  userId: User.uid; // rater's UID
  itemId: Product.productId; // product or file ID
  score: number; // e.g., 1 to 5
  comment?: string;
  ratedAt: string;
}
export interface ProductCategoryList {
  id: string;
  _id: string;
  categoryName: string[];
  updatedAt?: string;
  icon?: string
}
export interface ProductCategory {
  id: string;
  categories: ProductCategoryList.categoryName;
  listedProducts: Product.productId[];
  listedProductsCount: number;
  createdAt: string;
  updatedAt?: string;
  schoolName?: string;
}
export interface Product {
  _id?: string;
  productId: string;
  colors?: string[]; // optional
  sizes?: string[]; // optional
  id: string;
  schoolName: string;
  isAvailable?: boolean;
  category: ProductCategory.categoryName;
  sellerId: User.uid; // UID of lecturer or student
  title: string;
  inStock?: string;
  description?: string;
  mediaUrls: string[]; 
  type: 'product' | 'File';
  priceInPoints: number;
  lockedWithPassword?: boolean;
  password?: string; // only accessible after purchase
  createdAt: string;
  ratings: Rating[];
  isFile?: boolean;
  fileUrl?: string; // if isFile is true
  fileSizeInMB?: number; // optional
  downloadCount?: number; // optional
  favCount?: number;
  location?: string // optional
}
export interface CartItem {
  id: string;
  itemId: Product.productId;
  quantity: number;
}
export interface Cart {
  userId: string;
  cartItems: CartItem.itemId[];
  totalCartItemQuantity: number;
  totalCartValueInPoints: number;
  addedAt: string;
  updatedAt?: string;
}
export interface Refund {
  id: string;
  refundId: string;
  sellerId: Product.sellerId;
  buyerId: User.uid;
  ProductId: Product.productId;
  complaint: string;
  requestedAt: string;
  refundedAt?: string;
  pointsRefunded?: number;
  status?: 'successful' | 'cancelled';
}
export interface Purchase {
  id: string;
  purchaseId: string;
  sellerId: Product.sellerId;
  buyerId: User.uid;
  productId: Product.productId;
  purchasedAt: string;
  pointsUsed: number;
  unlockedPassword?: string; // if applicable
  status?: 'successful' | 'refunded' | 'cancelled';
}
export interface UserPointsAccount {
  id: string;
  pointsAccountId: string;
  userId: User.uid;
  role?: User.usertype;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastTransaction?: PointsTransaction;
  purchases?: Purchase[];
  refunds?: Refund[];
  withdrawalHistory?: WithdrawalRequest[];
  buyHistory?: BuyRequest[];
  transferredPointsHistory?: TransferPointsRequest[];
  recievedPointsHistory?: RecievePointsRequest[];
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'; // optional gamification
}
export interface WithdrawalRequest {
  id: string;
  withdrawalRequestId: string;
  userId: User.uid;
  pointsRequested: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
export interface BuyRequest {
  id: string;
  buyRequestId: string;
  userId: User.uid;
  pointsRequested: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
export interface PurchaseHistory {
  id: string; // unique purchase record ID
  userId?: User.uid; // reference to User.uid
  status: 'pending' | 'approved' | 'rejected';
  totalProductsPurchased: number;
  totalPointsSpent: number;
  items: {
    productId: string;
    title: string;
    quantity: number;
    priceInPoints: number;
    selectedSize?: string;
    selectedColor?: string;
    selectedQuantity?: string;
    fileUrl?: string;
  }[];
  date: string; // ISO timestamp
}


export interface TransferPointsRequest {
  id: string;
  transferRequestId: string;
  senderId: User.uid;
  recieverId: string;
  pointsRequested: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
export interface RecievePointsRequest {
  id: string;
  recieveRequestId: string;
  senderId: string;
  recieverId: User.uid;
  pointsRequested: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
export interface CalendarEvent {
   _id: string;
  id: string;
  userId?: User.id;
  createdBy: string; // UID of the user
  creatorType: UserType;
  title: string;
  description?: string;
  courseTitle?: string;
  department?: string;
  level?: string;
  startDate: string;
  endDate: string;
  eventType?: string;// optional if using startDate/endDate
  lectureType?: string; // for lecturer events
  visibility?: 'private' | 'department' | 'public';
  restriction?: string; // controls who can see it
  createdAt: string;
  eventTime?: string;
  location?: string;
  eventStartTime?: string; // e.g., "14:00"
  eventEndTime?: string;   // e.g., "15:30"
  isRecurring?: boolean;
  recurrenceRule?: string; // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  tags?: string[]; // e.g., ['exam', 'group meeting', 'revision']
}
export interface EventReminder {
  eventId: string;
  userId: string;
  reminderTime: string;
  event?: EventNote;
}
export interface EventNote {
  eventId: string;
  userId: string;
  content: string;
  timestamp: string;
  location?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  tags?: string[]; // e.g., ['exam', 'group meeting', 'revision']
}

export interface UserTransactions {
  id: string; // unique ID for this transaction group (optional)
  userId: string; // or User['uid'] if referencing from your User type
  transactions: Transaction[];
}
export interface Transaction {
  id: string; // unique DB ID
  transactionId: string; // external or internal reference
  type: PurchaseTransactionType;
  amountInPoints: number;
  date: string; 
}
export interface Course {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  department: string;
  level: string;
  schoolName: string;
  lecturerIds: User.uid[]; 
  studentsEnrolled: User.uid[];
  credits?: number;
  semester?: string; 
  session?: string;
  createdAt: string; 
  isActive?: boolean;
}
export interface UserBillingAddressDetails {
  id?: string;
  state?: string;
  city?: string;
  street?: string;
  zip?: string
}
export interface UserBankOrCardDetails {
  id?: string;
  cardOrBankDetailsId: string;
  userId: User.uid;
  paymentToken?: string;
  method: 'card' | 'bank';
  provider?: string;
  lastFourDigits?: string;
  cardBrand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  bankName?: string;
  country?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?:string;
  bankAccNumber?: string;
  accountHolderName?: string;
  bankCode?: string;
  billingAddressDetails?: UserBillingAddressDetails;
}
export interface TransactionMiddleState {
  transactionId:  string;
  sellerId: User.uid;
  buyerId: User.uid;
  priceInPoints: number;
  status: {
    type: string;
    enum: ["pending", "completed", "rejected"];
    default: "pending";
  };
  productIdArrays: Product.productId[];
  createdAt: string;
  updatedAt: string
};
export interface Deals {
  dealId:  string;
  sellerId: User.uid;
  buyerId: User.uid;
  totalPriceInPoints: number;
  dealStatus: string;
  items: {
    productId: string;
    productTitle: string;
    priceInPoints: number;
  };
  dealDate: string;
};
export interface UserRecordEntry {
  type: string;
  status: string;
  message: string;
  refDate: string; // e.g. "2025-11-12"
  refTime: string; // e.g. "23:05"
}
export interface UserRecords {
  userId: string;
  records: UserRecordEntry[];
}


