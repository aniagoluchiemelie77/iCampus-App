import mongoose from 'mongoose';
const usertype = {
  type: String,
  enum: ['student', 'lecturer', 'admin'],
}
const userSchema = new mongoose.Schema({
  name: String,
  usertype: usertype,
  uid: String,
  email: String,
  firstname: String,
  lastname: String,
  isFirstLogin: Boolean,
  schoolName: String,
  communities: [String],
  pointsBalance: Number,
  staffId: String,
  accessToken: String,
  ipAddress: [String],
  deviceType: [String],
  password: String,
  matricNumber: String,
  department: String,
  profilePic: String,
  hasSubscribed: Boolean,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  twoFactorEnabled: Boolean,
  lastLogin: Date,
  phoneNumber: String,
  country: String,
  badges: [String],
  level: Number,
  assignedCourses: [String],
  coursesEnrolled: [String],
  isCourseRep: Boolean,
  appVersion: String,
  // add other fields here
});

export default mongoose.model('User', userSchema);
