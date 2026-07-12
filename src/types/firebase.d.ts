import { NavigationProp } from '@react-navigation/native';

export type UserType = 'student' | 'lecturer' | 'otherUser' | 'enterprise';
export type TransactionType = 'buy' | 'withdraw' | 'transfer' | 'recieve';
export type PurchaseTransactionType = 'pending' | 'successful' | 'rejected';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen' | 'deleted';
export type AttachmentType = 'image' | 'video' | 'file';
export type DeliveryGateway = 'drop_off' | 'home_delivery';
export type UserTier = 'free' | 'pro' | 'premium'; 
export type ThemeType = 'light' | 'dark' | 'system';
export type AdminRole = "super_admin" | "moderator" | "support" | "finance" | "analyst";
export type SuspiciousActivityType = 
  | "UNRECOGNIZED_LOCATION"
  | "HEAVY_TRANSFER"
  | "HEAVY_WITHDRAWAL_ATTEMPT"
  | "SESSION_REVOKED"
  | "PIN_RESET_WHILE_SUSPICIOUS"
  | "FAILED_PIN_ATTEMPT";
export interface SuspiciousActivity {
  type: SuspiciousActivityType;
  timestamp: string; 
}
export interface PhoneNumber {
  number: string;
  isVerified: boolean;
  verifiedVia: 'sms' | 'whatsapp';
  addedAt: string;
}
type WelcomePayload = { userName: string };
type OrderCancelledPayload = {
  orderId: string;
  productName: string;
  reason: string;
  buyerName: string;
  date: Date | string;
  time: Date | string;
};
type NewOrderPayload = { 
  orderId: string;
  productName: string;
  buyerName: string;
  amount: number;
  deliveryMethod: string;
  stationName: string;
  stationAddress: string;
  buyerAddress: string;
  buyerPhoneNumber: string;
  date: Date | string;
  time: Date | string; 
};
type OrderDroppedOffPayload = { 
  userName: string;
  productName: string;
  orderId: string;
  stationName: string;
  stationAddress: string;
};
type AgentAwaitingPickupPayload = { 
  agentName: string;
  productName: string;
  orderId: string;
  stationName: string;
  date: Date | string;
  time: Date | string;
};
type NewLoginPayload = { 
  userName: string;
  ipAddress: string;
  location: string;
  date: Date | string;
  time: Date | string;
};
type PasswordChangedPayload = { 
  userName: string;
  date: Date | string;
  time: Date | string;
};
type OrderCompletedPayload = { 
  amount: string;
  userName: string;
  productName: string;
  orderId: string;
  role: "agent" | 'seller';
};
type PostDeletionPayload = { 
  username: string;
  postId: string;
};
type LearningReminderPayload = { 
  productId: string;
  currentProgress: number
};
type TestSubmittedPayload = { 
  testId: string;
  submissionId: string;
  isFlagged: boolean;
  actionEnforced: "SCORE_NULLIFIED" | "RECORDED";
  title: string;
};
type ExceptionSubmittedPayload = { 
  exceptionId: string;
  newBalance: number;
  courseTitle: string;
  lectureTitle: string;
};
type CoursesExtractedPayload = { 
  courseCount: number;
  level: string;
  matricNo: string;
  semester: string;
  session: string;
};
type PasswordResetCodePayload = { 
  code: number;
  userName: string;
  expiryTime: Date | string;
};
type EmailVerificationPayload = { 
  code: number;
};
type LectureReminderPayload = { 
  courseId: string;
  lectureId: string;
  topicName: string;
  startTime: Date | string;
  location: string;
  userName: string;
};
type SubscriptionUpgradedPayload = { 
  userName: string;
  tier: UserTier,
  amount: number;
  currency: string;
  transactionId: string;
};
type IcashPinResetPayload = { 
  userName: string;
  date: Date | string;
  time: Date | string;
};
type CourseCompletedPayload = { 
  userName: string;
  productName: string;
  pdfUrl: string;
  productId: string;
};


type ActionPayloadMap = {
  COURSE_COMPLETED: CourseCompletedPayload;
  WELCOME_USER: WelcomePayload;
  ORDER_CANCELLED: OrderCancelledPayload;
  NEW_ORDER: NewOrderPayload;
  ORDER_DROPPED_OFF: OrderDroppedOffPayload;
  AGENT_AWAITING_PICKUP: AgentAwaitingPickupPayload;
  NEW_LOGIN: NewLoginPayload;
  PASSWORD_CHANGED: PasswordChangedPayload;
  ORDER_COMPLETED: OrderCompletedPayload;
  POST_DELETION: PostDeletionPayload;
  LEARNING_REMINDER: LearningReminderPayload;
  TEST_SUBMITTED: TestSubmittedPayload;
  EXCEPTION_SUBMITTED: ExceptionSubmittedPayload;
  COURSES_EXTRACTED: CoursesExtractedPayload;
  PASSWORD_RESET_CODE: PasswordResetCodePayload;
  EMAIL_VERIFICATION: EmailVerificationPayload;
  LECTURE_REMINDER: LectureReminderPayload;
  SUBSCRIPTION_UPGRADED: SubscriptionUpgradedPayload;
  ICASH_PIN_RESET: IcashPinResetPayload;
  // ... add all other types here
};

export interface PostReposter {
  uid: string;
  firstname: string;
  lastname?: string;
  username?: string;
  tier: UserTier,
  organizationName?: string;
  profilePic: [String],
  repostedAt: { type: Date },
};
export interface UserSession {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  location: string;
  lastUsed: Date;
  refreshToken: string
};
export interface CartItem {
  productId: string;
  quantity: number;
  selectedColor?: string; 
  selectedSize?: string;  
}
export interface Payout
  {
    payoutId: string;
    sellerUid: string;
    amount: number;
    status: "processing" | "completed" | "failed" | "cancelled";
    method: string;
    reference: string;
    createdAt: Date;
  }
;
export interface User {
  uid: string;
  bio?: string;
  providerId?: string;
  schoolAvatarUrl?: string;
  theme: ThemeType;
  headline?: string;
  sessions?: UserSession[];
  usertype?: UserType;
  firstname?: string;
  lastname?: string;
  username?: string;
  isFirstLogin?: boolean;
  schoolName?: string;
  organizationName?: string;
  website?: string;
  jobTitle?: string;
  verificationToken?: string;
  email: string;
  pointsBalance?: number;
  pendingSalesBalance?: number;
  staffId?: string;
  likes?: string[]; 
  bookmarks?: string[];
  accessToken: string;
  password: string;
  tier?: UserTier;
  matricNumber?: string;
  department?: string;
  profilePic?: string[];
  hasSubscribed: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  suspiciousActivity?: SuspiciousActivity[]; 
  phoneNumbers?: PhoneNumber[];
  country?: string;
  schoolCode?: string;
  current_level?: string;
  coursesEnrolled?: Course['courseId'];
  blockedUsers?: string[];
  isVerified?: boolean;
  userToken?: string;
  tokenCreatedAt?: string,
  coursesTeaching?: Course['courseId'];
  cart?: CartItem[];
  favorites?: string[];
  purchaseHistory?: Order['orderId']; 
  salesHistory?: Order['orderId'];
  userAccountDetails?: UserBankOrCardDetails['userId'];
  secondSemesterUnits?: string,
  firstSemesterUnits?: string,
  currentIScore?: number,
  previousIScore?: number,
  itagusername?: string,
  skills?: string[]; 
  recoveryEmails?: { email: string; isVerified: boolean; addedAt: string; }[];
  isSuspended: boolean;
};
export interface Admin {
  uid: string;
  firstname: string;
  lastname: string;
  email: string;
  adminType: AdminRole;
  profilePic: string[];
  country?: string;
  isVerified: boolean;
  lastAccessed: string;
  sessions?: UserSession[];
  createdAt: string;
}
export interface Notification<T extends keyof ActionPayloadMap = any> {
  notificationId: string; 
  isRead: boolean;
  createdAt: string,
  recipientId: string;
  recipientEmail?: string;
  senderId?: string;
  recipientUserType?: string;
  category: 
    "auth" | 
    "social" |
    "classroom" |
    "store" |
    "finance" |
    "profile" |
    "security" |
    "reminder" |
    "signup" |
    "subscription"
  ;
  currency?: string;
  actionType: T;
  title: string;
  message: string;
  relatedEntity?: {
    entityId: string;
    entityType: string;
  };
  payload: ActionPayloadMap[T];
}
export interface userPreferences
  {
    userId: string;
    notifications?: {
      auth: boolean;
      social: boolean;
      classroom: boolean;
      store: boolean;
      finance: boolean;
      profile: boolean;
      security: boolean;
    };
    channels?: {
      push: boolean;
      email: boolean;
      socket: boolean;
    };
    theme: "light" | "dark" | "system-default";
    language: string;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string; 
    }
  };
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
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}
export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}
export interface DropOffStation {
  id: string;
  name: string;        
  address: string;     
  code: string;        
  contactPerson?: string; 
  agentId: string;
  images: string[];
  latitude?: number;
  longitude?: number;
  distance?: string;
  createdAt:  Date | string;
}
export interface Product {
  _id?: string;
  productId: string; 
  sellerId: string; 
  impressions: number;
  sales: number;
  schoolName?: string;
  type: 'physical' | 'course' | 'file';
  category: string;
  title: string;
  description?: string;
  priceInPoints: number; 
  mediaUrls: string[]; 
  amountInStock: number;
  physicalDetails?: {
    colors?: string[];
    sizes?: string[];
    inStock: string;
    weightKg: string; 
    sellerGateways: DeliveryGateway[];
    isNationalShippingAvailable?: boolean;
    dropOffAddress: DropOffStation[];
  };
  courseDetails?: {
    courseId: string; 
    lecturerIds: string[];
    totalReviews: number;
    studentsEnrolled: string[];
    totalLessons: number; 
    content: {
      title: string;
      videoUrl: string;
      duration: number; 
      isFreePreview: boolean;
    }[];
  };
  fileDetails?: {
    fileName: string;
    fileSizeInMB: number;
    fileFormat: string;
    fileUrl: string; 
    hasPassword: boolean; 
    isUploading: boolean;
  };
  ratings: {
    userId: string;
    score: number;
    comment: string;
  }[];
  favCount: number;
  isAvailable: boolean;
  createdAt: string;
  niche:
      "Electronics" |
      "Courses" |
      "Documents" |
      "Fashion" |
      "Stationery" |
      "Snacks and Deserts" |
      "Food" | 
      'Templates' | 
      'Software Assets' |
      'Audio Resources' | 
      'Health & Beauty' | 
      'Crafts'
}
export interface ProductSale {
  sellerId: string;
  productId: string;
  orderId: string;
  productType: 'physical' | 'file' | 'course';
  quantity: number;
  amountPaid: number;
  buyerId: string;
  netEarnings: number;
  createdAt: string | Date;
}
export interface MarketplaceOrder {
  orderId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productName: string;
  productType: 'physical' | 'file' | 'course'; 
  deliveryMethod: DeliveryGateway;
  quantity: number;
  cancellationReason: string;
  amountPaid: number;
  status: "pending_delivery" | "completed" | "cancelled" | "dropped_off";
  selectedStation?: DropOffStation;
  fileUrl?: string;
  createdAt: string;
  agentId?: string;
  verificationQrCode?: string;
  isVerifiedByScan?: boolean;
  completedAt?: string
}
export interface WithdrawalRequest {
  id: string;
  withdrawalRequestId: string;
  userId: User.uid;
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
export interface iCampusOperationalInstitutionSchema {
  id?: string;
  schoolName: string;
  contactEmail: string;
  schoolCode: string;
  dateJoined: Date | string;
  timeJoined: Date | string;
  logo: string;
  currentiScoreAvg: number;
  previousiScoreAvg: number;
  createdAt: Date | string;
};
export interface Transactions {
  transactionId: string; 
  userId: User['uid'];
  type:
      "buy" |
      "withdraw" |
      "p2p_sent" |
      "p2p_received" |
      "payment" |
      "exceptionsDividend" |
      "refund"
  ;
  payType: 'in' | 'out';
  title: string;
  amountICash: number;
  amountLocal?: number;
  status?: "pending" | "success" | "failed";
  reference?: string,
  metadata?: TransactionMetadata,
  createdAt?: string
};
interface UserProfileSummary {
  username: User['username'];
  itagusername?: User['itagusername'];
  email?: User['email'];
}

interface TransactionMetadata {
  recipientId?: string;
  senderId?: string;
  note?: string;
  senderItag?: string;
  recipientItag?: string;
  counterpartyProfile?: UserProfileSummary; 
}
export interface UserBillingAddressDetails {
  state?: string;
  city?: string;
  street?: string;
  zip?: string
}
export interface UserBankOrCardDetails {
  id?: string; 
  userId: string; 
  method: 'card' | 'bank';
  paymentToken: string; 
  lastFourDigits?: string;
  cardBrand?: string;
  bankName?: string;
  bankAccNumber?: string;
  bankCode?: string;
  accountHolderName?: string;
  country?: string;
  isDefault: boolean;
  expiryMonth?: string;
  expiryYear?: string;
  billingAddressDetails?: UserBillingAddressDetails;
  createdAt: string;
  updatedAt?: string;
}
export interface PollOption {
  optionId: string;
  text: string;
  votes: string[]; // Array of user UIDs who voted for this option
}
export interface Posts {
  _id: string;
  postId: string;
  content: string;
  media?: {
    mediaType: string | null;
    url: string;
  };
  likes?: string[];
  comments?: {
    commentId: string;
    userId: string;
    comment: string;
    parentId: string;
    likes?: string[];
    createdAt: string;
    updatedAt?: string;
  }[];
  commentsCount?: number;
  bookmarks?: string[];
  impressions?: number;
  shares?: string[]; 
  isRepost: boolean;
  originalPostId?: string; 
  repostersDetails: PostReposter[],
  featuredReposter?: PostReposter;
  sharesCount?: number;
  createdAt: string;
  poll?: {
    options: PollOption[];
    expiresAt: string; 
    totalVotes: number;
  };
  originalAuthor?: string
  postType?: "media" | "job" | "event" | "poll";
  jobMetadata?: {
    title: string;
    company: string,
    location: string, 
    type: { type: string, enum: ["Full-time", "Part-time", "Internship", "Contract"] },
    salaryRange: string,
    applicationLink: string,
  };
  eventMetadata?: {
    title: string,
    startDate: string,
    endDate: string,
    location: string, 
    isVirtual: boolean,
    attendees: string[];
  };
}
export interface Comment {
  commentId: string;
  userId: string; 
  comment: string;
  likes: string[];
  parentId: string;
  createdAt: string;
  replies?: Comment[];
}
export interface Lecture {
  id: string;
  _id?: string;
  courseId: Course['courseId'];
  topicName: string;
  hostId?: string;
  lectureType: 'Physical' | 'Online';
  location?: string;
  startTime: string; 
  streamUrl?: string;
  sharedScreenStreamUrl?: string;
  endTime: string;
  date: string;
  isLive?: boolean;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  isTaught: boolean;
  videoUrl?: string; 
  resources?: string[];
  attendance?: User.uid[];
  getAttendanceMode?: 'Uploaded' | 'Online'; 
  isLecturerMuted?: boolean;   
  isLecturerCameraOn?: boolean;
  lecturerCameraUrl?: string; 
  views?: number;
  likes?: number 
  comments?: Comment[];
  department?: string;
  level?: string;
}
export interface Course {
  id: string;
  _id?: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  niche?: string;
  department: string;
  courseContents?: string[];
  Lectures?: Lecture[];
  resources?: string[];
  assignments?: Assignment[];
  level?: string;
  tests?: CreateTestPayload[];
  schoolName?: string;
  lecturerIds?: string[]; 
  studentsEnrolled: string[];
  credits?: number;
  semester?: string; 
  session?: string;
  createdAt: string; 
  isActive?: boolean;
  price?: number;            
  thumbnailUrl?: string;
  rating?: number;  
  description?: string;        
  totalReviews?: number;
  isPublished?: boolean;    
  instructorName?: string;  
  courseDuration?: string; 
  reviews?: Review[];
}
export interface CourseException {
  _id?: string;
  id: string;
  studentId: User['uid'];
  studentInfo: {
    fullname?: string;
    matricNumber?: string;
  };
  department?: string;
  courseInfo: {
    courseTitle?: string;
    courseCode?: string;
  };
  courseId: string;
  lectureId: string;
  reasonCategory: 'Medical' | 'Family Emergency' | 'Technical Issue' | 'Personal' | 'Other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  lecturerComment?: string;
  date: string;
  attachmentUrl?: string | null;
  createdAt: string;
}
export interface Assignment {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  submissionInfo?: string;
  courseId: Course['courseId'];
  lectureId?: Lecture['id'];
  fileUrl?: string;
  dueDate: string; 
  createdAt?: string;
  submissionMethod: 'Online' | 'Physical'; 
  submissions?: {
    studentId: string;
    fileUrl?: string; // Optional for Physical
    submittedAt: string;
    venue?: string;
    isReceived: boolean; 
  }[];
}
export type CreateLecturePayload = Omit<
  Lecture, 
  'id' | '_id' | 'isTaught' | 'attendance' | 'status'
> & {
  repeatWeeks: number; 
};
export interface Question {
  id: string;
  type: 'MCQ' | 'ShortAnswer' | 'TrueFalse';
  questionText: string;
  options?: string[];
  correctAnswer: string; 
}
export interface CreateTestPayload {
  id?: string;
  _id?: string;
  courseId: Course['courseId'];
  description?: string;
  title: string;
  duration: number; 
  totalMarks: number; 
  questions: Question[];
  isPublished: boolean;
  status: 'published' | 'draft';
  createdAt: string;
  dueDate: string;
  scheduledStart?: string; // optional field for scheduling
}

export interface TestSubmission {
  testId: string;
  totalPossibleScore?: number;
  studentId: string; 
  studentName: string;
  matricNumber: string; 
  answers: { questionId: string; studentAnswer: string }[];
  score: number;
  status: 'submitted' | 'graded' | 'pending';
  submittedAt: string;
  proctoringData?: {
    deviceId: string;
    entrySelfieUrl: string;
    tabSwitchCount: number;
    ipAddress: string;
  };
  startTime?: string
}
export interface Book {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  extension: string; 
  size: string;
  downloadUrl: string;
  year?: string;
}
export interface ITag {
  userId: string;
  username: string;
  cardHolderName: string;
  cardNumber: string; // Masked or full: "3021 **** **** ****"
  expiryDate: string; // "04/28"
  layoutType: 'modern';
  tier: 'pro' | 'premium' | 'free';
  designOptions: {
    backgroundColor: string; 
    backgroundImage?: string; 
    glassmorphismOpacity: number; 
    accentColor: string; 
  };
  cardBrand: 'mastercard' | 'visa' | 'verve' | 'discover' | 'american express';
  isDefault: boolean;
  createdAt: Date;
}
export interface StatsData {
  flow: Array<{ _id: 'in' | 'out'; total: number }>;
  topRecipients: Array<{ _id: string; count: number; total: number, name: string }>;
  monthly: Array<{ _id: number; total: number }>;
  currency: string;
}
export interface RankCardProps {
  item: User;
  rank: number; 
  userRole: UserType;
  navigation: NavigationProp<any>;
}
export interface RankCardCarouselProps {
  userRole: UserType;
  navigation: NavigationProp<any>;
  data: User[];
}
export interface Attachment {
  url: string;
  type: AttachmentType;
  fileName?: string; 
  fileSize?: number;
}
export interface ChatMessage {
  id: string;
  text?: string; 
  senderId: string;
  recipientId?: string;
  firstName: string;
  lastName?: string;
  timestamp: string;
  profilePic?: string;
  status: MessageStatus;
  attachments?: Attachment[];
  isEdited?: boolean;
  deletedBy?: string;
}
export type AssistantMessage = {
  role: 'user' | 'model';
  content: string;
  attachments?: {
    url: string;
    type: 'image' | 'file';
    fileName?: string;
  }[];
};

export type VerifiedStudent = {
  firstname: string;
  lastname: string;
  department: string;
  current_level: string;
  matricNumber: string;
  schoolAvatarUrl?: string;
  isVerified: boolean;
};

export type SignupResponse = {
  verified?: boolean;
  email?: string;
  message?: string;
  token?: string;
};

export type VerifiedInstructor = {
  firstname: string;
  lastname: string;
  department: string;
  staff_id: string;
  isVerified: boolean;
};
export interface EnrichedCourseProduct extends Product {
  progress: number;
  lastAccessed: string;
  completedLessons?: string[];
}
export interface Review {
  reviewerId: string;
  targetId: string;
  targetType: "product" | "seller" | "agent" | "course" | "lecturer";
  orderId?: string;
  rating: number;
  comment?: string;
  mediaUrls?: string[];
  attributes?: {
    deliverySpeed: number;
    accuracy: number;
    clarity: number;
  },
  createdAt: Date
};
export interface SupportTicket
  {
    userId: string;
    ticketRefId: string;
    source: "in-app"| "email";
    originalMessage?: string;
    category: 
     "technical" | "billing" | "content" | "other";
    summary?: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "open" | "pending";
    thread: [
      {
        sender: string;
        message: string;
        timestamp: Date;
      },
    ],
  };