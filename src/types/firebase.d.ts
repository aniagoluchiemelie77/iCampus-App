import { NavigationProp } from '@react-navigation/native';

export type UserType = 'student' | 'lecturer' | 'otherUser' | 'enterprise';
export type TransactionType = 'buy' | 'withdraw' | 'transfer' | 'recieve';
export type PurchaseTransactionType = 'pending' | 'successful' | 'rejected';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';
export type AttachmentType = 'image' | 'video' | 'file';
export type DeliveryGateway = 'drop_off' | 'home_delivery';

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
export interface User {
  uid: string;
  bio?: string;
  providerId?: string;
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
  communitiesId?: Community.communitiesId[];
  pointsBalance?: UserPointsAccount.currentBalance;
  staffId?: string;
  likes?: string[]; 
  bookmarks?: string[];
  accessToken: string;
  password: string;
  tier?: 'free' | 'pro' | 'premium';
  matricNumber?: string;
  department?: string;
  profilePic?: string[];
  hasSubscribed: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  phoneNumbers?: {
    number: string;
    isVerified: boolean;
    verifiedVia: 'sms' | 'whatsapp';
    addedAt: string;
  }[];
  country?: string;
  badges?: string[];
  schoolCode?: string;
  current_level?: string;
  coursesEnrolled?: Course['courseId'];
  blockedUsers?: string[];
  appVersion?: iCampusAppDetails.appVersion;
  isVerified?: boolean
  userToken?: string,
  tokenCreatedAt?: string,
  coursesTeaching?: Course['courseId'];
  pointsAccountId?: UserPointsAccount.pointsAccountId,
  cart?: CartItem[];
  favorites?: string[];
  purchaseHistory: Order['orderId']; 
  salesHistory?: Order['orderId'];
  userAccountDetails?: UserBankOrCardDetails.cardOrBankDetailsId[];
  secondSemesterUnits?: string,
  firstSemesterUnits?: string,
  currentIScore?: number,
  previousIScore?: number,
  itagusername?: string,
  skills?: string[]; 
  recoveryEmails?: { email: string; isVerified: boolean; addedAt: string; }[];
  referralCode?: string
};
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
  id: string; // MongoDB _id
  notificationId: string; // Your custom logic ID (e.g., LECTURE_123)
  userId?: string; 
  title?: string;
  message: string;
  category: 'finance' | 'security' | 'academic' | 'course' | 'social' | 'announcement';
  isRead: boolean;
  createdAt: string;
  relatedClassSessionId?: string;
  isPublic?: boolean;
  relatedSchoolName: string;
  department?: string;
  level?: string;
  type?: string; // e.g., 'classroom', 'finance'
  status?: string; // e.g., 'pending', 'approved'
  transactionIdMid?: string;
  fileUrls?: string[];
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
  allowedRolesToCreate?: UserType[]; // restrict creation by role
  candidates: PollCandidate[];
  invitedUserIds: string[];
  startDate: string;
  endDate: string;
  totalVotes: number;
  department?: string; // if visibility is 'department'
  restriction?: string; // optional
  level?: string; // optional
  createdByRole: UserType;
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
  sellerId: string; 
  schoolName?: string;
  type: 'physical' | 'course' | 'file';
  category: string;
  title: string;
  description?: string;
  priceInPoints: number; 
  mediaUrls: string[]; 
  physicalDetails?: {
    colors?: string[];
    sizes?: string[];
    inStock: number;
    weightKg: number; 
    sellerGateways: DeliveryGateway[];
    isNationalShippingAvailable: boolean
  };
  courseDetails?: {
    courseId: string; 
    lecturerIds: string[];
    duration: number;
    totalReviews: number;
    studentsEnrolledCount: number;
    studentsEnrolled: string[];
  };
  fileDetails?: {
    fileName: string;
    fileSizeInMB: number;
    fileFormat: string;
    fileUrl: string; 
    hasPassword: boolean; 
  };
  ratings: {
    userId: string;
    score: number;
    comment: string;
  }[];
  favCount: number;
  isAvailable: boolean;
  createdAt: string;
}
export interface Order {
  orderId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amountPaid: number;
  status: 'pending_delivery' | 'completed' | 'cancelled';
  deliveryMethod: 'drop_off' | 'home_delivery';
  verificationQrCode: string; 
  isVerifiedByScan: boolean;
  generatedFilePassword?: string; 
  createdAt: string;
  completedAt?: string;
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
export interface iCampusOperationalInstitutionSchema {
  id?: string;
  schoolName: string;
  contactEmail: string;
  schoolCode: string;
  dateJoined: string;
  timeJoined: string;
  logo: string;
  currentiScoreAvg: number;
  previousiScoreAvg: number;
};
export interface UserTransactions {
  id: string; // unique ID for this transaction group (optional)
  userId: string; // or User['uid'] if referencing from your User type
  transactions: Transaction[];
}
export interface Transaction {
  id: string; 
  transactionId: string; // external or internal reference
  type: PurchaseTransactionType;
  amountInPoints: number;
  date: string; 
}
export interface Transactions {
  transactionId: string; 
  userId: User['uid'];
  type:
      "buy" |
      "withdraw" |
      "p2p_sent" |
      "p2p_received" |
      "payment" |
      "exceptionsDividend"
  ;
  payType: 'in' | 'out';
  title: string;
  amountICash: number;
  amountLocal?: number;
  status?: "pending" | "success" | "failed";
  reference?: string,
  metadata?: {
    recipientId:  string;
    bankName: string;
  },
  createdAt?: string
};
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
export interface PollOption {
  optionId: string;
  text: string;
  votes: string[]; // Array of user UIDs who voted for this option
}
export interface Posts {
  _id: string;
  postId: string;
  userId: {
    uid: string;
    firstname: string;
    lastname: string;
    profilePic?: string;
  };
  content?: string;
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
  repostsCount: number;
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
  lectureType: 'Physical' | 'Online' | 'Recorded';
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
export interface Review {
  username: string;
  firstname: string;
  comment: string;
  rating: number;
  createdAt: string; 
}
export interface Assignment {
  _id?: string;
  title: string;
  description?: string;
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
export interface LecturerExceptionView extends CourseException {
  studentName?: string; 
  matricNumber?: string;
}
// This type requires the core fields but ignores the ones the backend generates
export type CreateLecturePayload = Omit<
  Lecture, 
  'id' | '_id' | 'isTaught' | 'attendance' | 'status'
> & {
  repeatWeeks: number; // Add the field required for bulk creation
};
export interface Question {
  id: string;
  type: 'MCQ' | 'ShortAnswer' | 'TrueFalse';
  questionText: string;
  options?: string[];
  correctAnswer: string; // Used for auto-grading
  points: number;
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
  rank: number; // Pass index + 1 from the list
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
  phone_number: string;
  matriculation_number: string;
  school_name: string;
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
  current_level: string;
  phone_number: string;
  staff_id: string;
  school_name: string;
};