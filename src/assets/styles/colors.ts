import { StyleSheet, Dimensions } from 'react-native';

export const PRIMARY_COLOR = '#f54b02';
export const PRIMARY_COLOR_TINT = '#f5743d';
export const PRIMARY_COLOR_TINT_MAIN = '#f9dccf';

export const PREMIUM_BADGE_COLOR = '#93370f';
export const PRO_BADGE_COLOR = '#f54b02';
export const ENTERPRISE_BADGE_COLOR = '#f5770a';

const screenWidth = Dimensions.get('window').width;
const { width, height } = Dimensions.get('window');
export const DEFAULT_GRADIENT = ['#3b2115', '#5a3c2e', '#e05515'];
export const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; 

export const MainSignupStyles = StyleSheet.create({
  background: {
    width,
    height,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 20
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  titleColored: {
    fontSize: 28,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '90%',
    borderWidth: 1.3,
    borderRadius: 10,
    borderColor: PRIMARY_COLOR,
    marginBottom: 15,
  },
  buttonText:{
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: 'bold'
  },
  footerDiv:{
    flexDirection: 'row',
    alignContent: 'center'
  },
  footerDivText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 3
  },
  footerDivText2:{
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold'
  },
  buttonBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBoxWithBorder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1.3,
    borderRightColor: PRIMARY_COLOR,
  },

})
export const StudentSignupStyles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  inputHeader: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
    marginVertical: 12,
  },
  inputHeaderLogin: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: 12,
  },
  header: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
    marginVertical: 12,
    width: '100%',
    textAlign: 'center',
  },
  mainHeader:{
    fontSize: 25,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginVertical: 15,
    width: '100%',
    textAlign: 'center',
  }, 
  inputHeader2: {
    fontSize: 13,
    color: '#222',
    marginVertical: 10,
  },
  selector: {
    width: '100%',
    padding: 10,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorHeader2: {
    fontSize: 15,
    color: PRIMARY_COLOR_TINT,
  },
  dropdown: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    color: '#222',
  },
  input: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: .8,
    color: '#222',
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
  },
  input2: {
    flex: 1,
    padding: 10,
    color: '#222',
  },
  passwordInput: {
    width: '100%',
    borderRadius: 5,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextButton: {
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 20,
    borderRadius: 15,
    alignContent: 'center',
  },
  nextButton2: {
    minWidth: 'auto',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton3: {
    minWidth: 'auto',
    padding: 12,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  nextButtonText3: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    color: PRIMARY_COLOR,
  },
  footerDiv: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'absolute',
    bottom: 15,
    left: 20,
  },
  footerDivText: {
    fontSize: 15,
    color: '#222',
    marginRight: 5,
  },
  footerDivText2: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    marginHorizontal: 5,
    width: '90%',
    alignSelf: 'flex-start',
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  rowDiv: {
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  rowDiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  rowDivText: {
    color: '#929191',
    fontSize: 12,
  },
  rowDivBtn: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '800',
  },
  termsBox: {
    height: 150,
    width: '100%',
    padding: 10,
    borderWidth: 0.7,
    borderColor: '#929191',
    marginVertical: 10,
  },
  termsText: {
    color: '#222',
    fontSize: 15,
    paddingBottom: 30,
    lineHeight: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15, // Better spacing for modern UI
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 22, // Slightly larger for better tap targets
    height: 22,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 6, // Slightly more rounded for a modern look
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Space between box and text
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
  },
  checkboxLabel: {
    color: '#444',
    fontSize: 14,
    fontWeight: '500', // Medium weight feels cleaner
  },
  linkText: {
    color: PRIMARY_COLOR,
    textDecorationLine: 'underline',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  avatarWrapper: {
    position: 'relative', 
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 75,
    padding: 5,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: PRIMARY_COLOR,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4, // Shadow for Android
    shadowColor: PRIMARY_COLOR_TINT, // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  skipLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  skipLinkText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
   selectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Or your container background
  },
  nextButton4: {
    minWidth: '100%',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    // Elevation for Android
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  cardSub: {
    fontSize: 14,
    color: '#929191',
    textAlign: 'center',
    marginTop: 5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: 14,
  },
  socialContainer: {
    gap: 5,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 0.7,
    borderColor: '#f89b74',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginBottom: 10,
    minWidth: '90%',
  },
  socialButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
});
export const HomeScreenComponentStyles = StyleSheet.create({
  bckg: {
    flex: 1,
    backgroundColor: '#eee',
    width: '100%',
    alignItems: 'center',
  },
  topHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topHeader3: {
    backgroundColor: 'inherit',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeHeader: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  welcomeText: {
    marginLeft: 5,
    fontSize: 19,
    fontWeight: 800,
  },
   welcomeText2c: {
    fontSize: 18,
    fontWeight: 700,
    color: PRIMARY_COLOR
  },
  welcomeText2b: {
    fontSize: 18,
    fontWeight: 700,
    color: '#222',
    width: '100%',
    paddingBottom: 7
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderColor: PRIMARY_COLOR, // Your preferred border color
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activityDiv: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '93%',
    height: 'auto',
    borderRadius: 15,
    flex: 1,
    margin: 7,
  },
  activityDivHeader: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1, // thickness of the border
    borderBottomColor: '#222',
  },
  activityDivHeaderText: {
    fontSize: 17,
    fontWeight: 800,
  },
  activityIconsDiv: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
  },
  storeCategoriesDiv: {
    padding: 8,
    alignItems: 'center',
    height: 60,
    flexDirection: 'row',         
    justifyContent: 'center',
    marginBottom: 40
  },
  storeCategoriesDivSubdiv: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabItem2: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tabLabel2: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4
  },
  activeTab: {
  borderBottomWidth: 2,
  borderBottomColor: '#FF6B6B',
  backgroundColor: '#fff',
},
notificationContainer:{
  position: 'relative',
},
badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: PRIMARY_COLOR,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff',
    fontSize: 10,
    fontWeight: 'bold', },
  blurBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  popupContent: {
    paddingBottom: 100,
  },
  popupContent2: {
    paddingTop: 5,
    paddingHorizontal: 10,
    width: '100%',
    marginVertical: 10,
    height: '100%',
  },
  clearCartDiv: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  clearCartBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    width: 'auto'
  },
  clearCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  viewCartItems: {
    padding: 10,
    width: '85%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#717070ff'
  },
  iconWrapper: { position: 'relative', marginRight: 16 },
  iconSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSubdiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  activityIcons: {
    padding: 10,
    margin: 4,
  },
  activityIconsb: {
    padding: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1
  },
  activityIcons3: {
    padding: 8,
  },
  activityIcons2: {
    borderRadius: '50%',
    backgroundColor: '#fff',
  },
  activityIcons2b: {
    borderRadius: '50%',
  },
  storeHeaderText:{
    fontWeight: '700',
    fontSize: 17,
    color: '#e94d0aff',
    maxWidth: '70%'
  },
  searchContainer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },
  searchInput: {
    padding: 10,
    backgroundColor: 'inherit',
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    width: '82%',
    borderColor: '#838181ff',
    color: '#222',
  },
  container: {
    width: 'auto',
  },
  activityDivContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  searchIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  iconText: {
    fontSize: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-start',
  },
  overlay2: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-end',
  },
  overlayRight: {
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-end',
    position: 'relative',
    top: 0,
    right: 0,
  },
  popup: {
    top: 0,
    left: 0,
    width: '90%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupCenter2: {
    width: '85%',
    maxHeight: '80%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  popupCenterSmall: {
    width: '40%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  popupBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '90%',
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupRight: {
    top: 0,
    right: 0,
    width: '80%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'absolute',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 5,
    right: 5
  },
  cancelIcon: {
    alignSelf: 'flex-end',
    width: 'auto',
  },
  CaddIcon: {
    bottom: 20,
    right: 15,
    position: 'absolute',
  },
  avatarProfile: {
    width: '100%', // spans full width of parent
    height: '100%', // adjust as needed
    resizeMode: 'contain',
  },
  profileImgDiv: {
    minWidth: '100%', // spans full width of parent
    height: 280,
    position: 'relative',
  },
  profileImgDivText: {
    bottom: 10, // spans full width of parent
    left: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    position: 'absolute', // adjust as neede
  },
  eventsContainer: {
    width: '100%',
    paddingVertical: 5,
    flex: 1,
    position: 'relative',
  },
  backToTodayButton: {
    bottom: 5,
    alignSelf: 'center',
    position: 'absolute',
  },
  eventCardOuterWidth: {
    maxWidth: '90%',
    backgroundColor: '#fff',
    height: 110,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    padding: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBorderHighlight: {
  borderWidth: 1,
  borderColor: PRIMARY_COLOR, // bright orange
},
  eventMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
},
eventMetaText: {
  marginLeft: 6,
  fontSize: 13,
  color: '#333',
},
todayIndicator: {
  backgroundColor: PRIMARY_COLOR,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  alignSelf: 'flex-start',
  marginTop: 6,
},
todayIndicatorText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
  eventsContainer2: {
    width: '100%',
    paddingVertical: 5,
    alignItems: 'center',
  },
  eventsDiv: {
    justifyContent: 'center',
  },
  eventVisibilityDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventVisibilityDiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'flex-start',
  },
  eventVisibilityDiv3: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  eventVisibilityText: {
    fontSize: 11,
    color: 'gray',
  },
  eventCard: {
    paddingVertical: 8,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    backgroundColor: '#fff',
  },
  eventTitle: {
    color: '#fff',
    padding: 5,
    fontSize: 12,
    alignSelf: 'flex-start',
    borderRadius: 5,
    fontWeight: '600',
    maxWidth: '90%',
  },
  eventDate: {
    fontSize: 11,
    color: 'gray',
  },
  eventDate2: {
    marginTop: 4,
    fontSize: 11,
    color: 'gray',
  },
  eventLocationDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
    paddingVertical: 5
  },
  eventLocation: {
    marginLeft: 2,
    alignSelf: 'flex-start',
  },
  eventDescription: {
    color: '#222',
    fontWeight: '700',
    paddingVertical: 4,
    maxWidth: '80%',
  },
  eventDescription2: {
    color: '#222',
    fontWeight: '700',
    paddingVertical: 5,
    width: '100%',
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 3,
  },
  lectureType: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    padding: 3,
    borderRadius: 5,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  productList: {
  marginVertical: 2,
  paddingBottom: 10,
  width: '100%'
},
 productCard: {
  flexBasis: '46%',
  margin: 6,
  borderRadius: 10,
  height: 270,
  alignItems: 'center',
  justifyContent: 'flex-start',
  backgroundColor: '#eee',
  overflow: 'hidden'
},
  productImage: {
    height: '100%',
    width: '100%',
    borderRadius: 10,
    aspectRatio: 1, // keeps image square regardless of source size
    resizeMode: 'cover',
  },
   productImageDiv: {
    height: 170,
    borderRadius: 10,
    position: 'relative',
    alignSelf: 'center',
    width: '100%', 
    alignItems: 'center', // center the image horizontally
    justifyContent: 'center',
    
  },
  productTitle: {
    paddingHorizontal: 8,
    paddingVertical: 11,
    width: '100%',
    fontWeight: '700',
    color: '#222',
    fontSize: 13,
    marginTop: 5
  },
  productPriceDiv: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: PRIMARY_COLOR
  },
  productPriceDiv2: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  productPrice: {
    fontWeight: '600',
    marginLeft: 3,
    fontSize: 13,
    color: '#eee'
  },
  productPrice2: {
    fontWeight: '600',
    marginLeft: 3,
    fontSize: 13,
    color: '#222'
  }
  , 
  pagination: {
    width: '50%',
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    marginVertical: 10,
    borderRadius: 15,
    justifyContent: 'space-between'
  },
  paginationMainText: {
    fontWeight: '700',
    color: PRIMARY_COLOR,
    fontSize: 17
  },
  paginationText: {
    fontWeight: '700',
  },
  Add2CartBtn: {
    width: '80%',
    padding: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  Add2CartBtnText: {
    fontWeight: '700'
  },
cartItemLeftDiv: {
  flex: 1,
  height: '100%',
  flexDirection: 'row',
  zIndex: 2,
},
cartItemRightDiv: {
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#fff',
  flex: 1,
},
 hiddenRow: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    alignItems: 'center',
    width: '100%', 
    height: 90,
    flexDirection: 'row',
    justifyContent: 'flex-end', // aligns content to the right
    borderRadius: 10,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    zIndex: 0,
    marginVertical: 7,
  },
  cartItem: {
    width: '100%',
  backgroundColor: '#fff',
  padding: 10,
  borderWidth: 1,
  borderColor: '#c0bebeff',
  marginVertical: 7,
  borderRadius: 10,
  flexDirection: 'row',
  height: 90,
  position: 'relative',
  zIndex: 1,
  overflow: 'hidden',
    justifyContent: 'space-between',
  }, 
  imageDiv: {
    width: '40%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  notImageDiv: {
    flex: 1,
    paddingLeft: 3,
    justifyContent: 'center',
  },
  cartItemRightDivSubdiv: {
    paddingVertical: 10,
  },
  cartItemRightDivSubdiv2: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 10,
    width: '90%',
    justifyContent: 'space-between',
    gap: 5
  },
  cartItemRightDivText: {
    marginTop: 3,
    flexDirection: 'row',
    fontWeight: '700',
    backgroundColor: '#fff'
  },
 
  totalSection: {
    width: '100%',
    flex: 1,
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#fff',
    zIndex: 2,
    padding: 13
  },
  totalSectionD1: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 10,
    width: '100%'
  },
  totalSectionCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    width: '100%'
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: "#222"
  },
  totalPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkoutBtn: {
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
    padding: 20,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#fb966bff',
  },
  checkoutText: {
    color: '#eee',
    fontWeight: '700',
    alignSelf: 'center',
    fontSize: 18,
  },
  totalPriceSign: {
    marginRight: 5
  },
  totalPriceValue: {
  flexDirection: 'row',
},
largeText: {
  fontSize: 30,
  fontWeight: 'bold',
  color: '#222',
},
smallText: {
  fontSize: 20, // same or slightly smaller than icon
  color: '#222',
},
settingsBtn: {
  flexDirection: 'row',
  paddingBottom: 10,
  flex: 1
},
appVersionText:{
  padding: 10,
  flex: 1,
  fontSize: 12,
  color: 'gray'
},
settingsBtnLeftdiv:{
  flex: 1,
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'flex-start'
},
settingsBtn2: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 15,
  flex: 1,
  alignItems: 'center',
},
settingsBtnRightdiv: {
  flex: 1,
  marginLeft: 10,
  alignItems: 'flex-start'
},
settingsBtnDiv:{
  width: '100%',
  borderTopWidth: 0.5,
  borderBottomWidth: 0.5,
  borderColor: '#f69d76ff',
},
settingsBtnRowdiv: {
  flexDirection: 'row',
  alignItems: 'center',
},
settingsBtnRowdivText: {
  fontSize: 15,
  fontWeight: '700',
  flex: 1,
  color: '#222',
  paddingBottom: 8
},
settingsBtnRowdivText2: {
  backgroundColor: '#f9cbb8ff',
  color: PRIMARY_COLOR,
  padding: 10,
  fontSize: 13,
  fontWeight: '700',
  borderRadius: 8
},
settingsBtnLeftdivText: {
  fontSize: 12,
  color: '#222'
}
});
export const WelcomeScreenStyles = StyleSheet.create({
  container: {
    flex: 1, // or any color you want
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
});
export const SignupScreenStyles = StyleSheet.create({
  bkg: {
    alignContent: 'center',
    backgroundColor: '#fadccc',
    flex: 1,
    position: 'relative'
  },
  container: {
    alignContent: 'center',
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    position: 'relative',
  },
  container2: {
    borderRadius: 15,
    alignContent: 'center',
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    position: 'relative',
    zIndex: 5,
    elevation: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  disabledBtn: {
    backgroundColor: PRIMARY_COLOR_TINT
  },
  tabButton: {
    padding: 5,
    color: '#222',
  },
  header: {
    fontSize: 20,
    color: '#222',
  },
  headerBtnsContainer: {
    flexDirection: 'row',
    width: '100%',
    alignContent: 'center',
    marginVertical: 15,
  },
  welcomeText: {
    color: '#222',
    fontSize: 13,
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 5
  },
  inputContainer: {
    padding: 10,
    width: '100%',
  },
  input: {
    borderWidth: .8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    borderColor: PRIMARY_COLOR_TINT,
    color: '#222',
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  input2: {
    padding: 10,
    minWidth: '85%',
    color: '#222',
  },
  validationText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 800,
  },
  passwordInputWrapper: {
    borderWidth: .8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderColor: PRIMARY_COLOR_TINT,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
    width: '100%',
  },
  toggleBtns: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignContent: 'center',
    width: '80%',
    backgroundColor: PRIMARY_COLOR,
  },
  selector: {
    padding: 15,
    backgroundColor: 'inherit',
    borderWidth: 1,
    width: '90%',
    borderColor: '#222',
    color: '#fff',
  },
  selectorHeader: {
    color: '#fff',
    fontSize: 14
  },
  passwordIcons: {
    marginRight: 9,
  },
  selectorHeader2: {
    color: '#222',
  },
  termsParagraph: {
    marginBottom: 10,
    fontSize: 17,
  },
  forgotPassParagraph: {
    fontSize: 14,
    color: PRIMARY_COLOR,
  },
  forgotPassDiv: {
    padding: 10,
    alignSelf: 'flex-end',
  },
  dropdown: {
    width: '100%',
    backgroundColor: 'inherit',
    borderWidth: 1,
    padding: 10,
    borderColor: '#222',
  },
});
export const homeStyles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fadccc',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  headerContainerDiv:{
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfilePic: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    backgroundColor: PRIMARY_COLOR, 
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, 
    shadowColor: '#222', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', 
    position: 'relative'
  },
  centerContent: {
    flex: 1,
    paddingBottom: 90,
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(250, 220, 204, 0.85)', 
    position: 'absolute',
    bottom: 15,
    left: 15, 
    right: 15,
    overflow: 'hidden', 
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderRadius: 25, 
    borderWidth: 1,
    borderColor: 'rgba(252, 249, 246, 0.3)', 
    zIndex: 10,
  },
  iconItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(253, 249, 245, 0.4)', 
    borderRadius: 20,
  },
  activeIconItem: {
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  activeIconLabel: {
    fontWeight: '700',
    fontSize: 11,
    color: PRIMARY_COLOR,
    marginTop: 4, 
  },
  header: {
    marginTop: 5,
    fontSize: 35,
    fontWeight: 700,
    color: '#222',
  },
});
export const EmailVerifyScreenStyles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    flex: 1,
    position: 'relative'
  },
  container: {
    alignItems: 'center',
    width: '90%',
    height: '55%',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    zIndex: 5,
  },
  infoText: {
    fontSize: 20,
    color: '#222',
    textAlign: 'center',
  },
});
export const CalendarScreenStyles = StyleSheet.create({
  container: {
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#fff',
    width: '100%',
    alignSelf: 'flex-start',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContainer2: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButton2: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1
  },
  callCenterbtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    color: PRIMARY_COLOR,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    width: '93%',
    backgroundColor: '#fff',
    marginVertical: 3,
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#fff',
  },
  inactiveTabButton: {
    backgroundColor: '#fff',
  },
  tabTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#222',
  },
  tabContentsContainer:{
    width: '93%',
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  inputGroup: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 3,
    alignItems: 'flex-start'
  },
  label: {
    fontWeight: '700',
    marginBottom: 2,
    color: '#222'
  },
  input: {
    width: '100%',
    padding: 7,
    borderWidth: 1,
    borderColor: '#787777ff',
    color: '#222'
  },
  inputGroupDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 3,
  },
  inputGroupDateSubdiv: {
    padding: 7,
    alignItems: 'flex-start'
  },
  input2: {
    width: '80%',
  },
  submitBtn: {
    marginTop: 13,
    backgroundColor: PRIMARY_COLOR,
  }

});
export const SweetAlertPopupStyles = StyleSheet.create({
  bckg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
export const ToastPopupStyles = StyleSheet.create({
  successToastDiv: {
    borderLeftColor: '#5ee762ff', 
    backgroundColor: '#fff'
  },
  successToastText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  errorToastDiv: {
    borderLeftColor: '#f12c1eff', 
    backgroundColor: '#fff'
  },
  errorToastText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  }
});
export const ProductDetailsStyles = StyleSheet.create({
  container: {
    backgroundColor: '#eee',
    flex: 1,
    position: 'relative',
  },
  container2: {
    padding: 6,
  },
  image: {
    width: Dimensions.get('window').width,
    height: 450,
    resizeMode: 'cover',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  description: {
    fontSize: 15,
    color: '#222',
    paddingVertical: 10,
  },
  price: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  largeText: {
  fontSize: 30, // larger than icon
  fontWeight: 'bold',
},
smallText: {
  fontSize: 20, // same or slightly smaller than icon
},
  carouselContainer: { position: 'relative', borderRadius: 10 },
  counter: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#fff',
    color: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  titleDiv: {
    width: '100%',
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
  },
  titleDivLeftDiv: {
    width: '70%',
  },
  category: {
    fontSize: 12,
    color: '#8a8989ff',
    paddingTop: 7,
  },
  quantityDiv: {
    width: '100%',
    paddingVertical: 7
  },
  quantityDivStockCount: {
    fontSize: 12,
    color: '#8a8989ff',
    width: '100%',
    marginBottom: 3,
  },
  quantityDivStockCount2: {
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
    marginRight: 3,
    width: '40%'
  },
  notStockCount: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  location: {
    fontSize: 12,
    color: '#8a8989ff',
    marginRight: 4,
  },
  titleDivRightDiv: {
    flex: 1,
  },
  titleDivRightDivSubdiv: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    width: '100%',
  },
  sizeAndColorsDiv: {
    flexDirection: 'row',
    marginVertical: 5,
    width: '100%',
  },
  sizeDiv: {
    padding: 15,
    margin: 7,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  colorsDiv: {
    padding: 15,
    margin: 7,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  option: {
    borderRadius: 10,
    backgroundColor: '#eee',
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
  },
  optionColor: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelectorsDiv: {
    marginTop: 7,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#222',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  sellerCard: {
    marginVertical: 5,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  sellerTitleDiv: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#222',
  },
  sellerInfo: {
    flexDirection: 'row',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfo2: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7
  },
  otherProductsPriceDivInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    position: 'absolute',
    zIndex: 1,
    bottom: 5,
    right: 5
  },
  sellerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 10,
  },
  sellerDetailsDiv: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerEmail: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  sellerPhone: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  sellerDept: {
    fontSize: 13,
    color: '#777',
  },
  footer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#fff',
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    height: 90,
  },
  leftFooter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  RightFooter: {
    width: '24%',
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    padding: 10,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtnText: {
    fontWeight: '700',
    color: '#eee',
  },
  fileInfoContainer: {
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 10,
  },
  fileInfoText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  fileInfoText2: {
    fontSize: 14,
    color: '#222',
    padding: 10,
  },
  fileInfoContainerLeftDiv: {
    width: '50%',
    padding: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoContainerRightDiv: {
    alignItems: 'flex-start',
  },
  secondText: {
    backgroundColor: '#eee',
    padding: 10,
  },
  otherProductsContainer: {
    marginVertical: 10,
    backgroundColor: '#fff',
    padding: 10,
  },
  otherProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    padding: 10,
  },
  otherProductCard: {
    width: 120,
    marginRight: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingVertical: 3,
  },
  otherProductImage: {
    width: '100%',
    height: '100%',
  },
  otherProductImageDiv: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  otherProductTitle: {
    fontSize: 13,
    padding: 7,
    fontWeight: '700',
    width: '100%',
    justifyContent: 'flex-start',
  },
  otherProductPrice: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 3,
  },
});
export const NotificationPageStyles = StyleSheet.create({
  container: {
    backgroundColor: '#eee',
    flex: 1,
  },
  notificationsContainer: {
    width: '100%',
    padding: 10,
    marginVertical: 7,
  },
  notificationsDivCard: {
    minWidth: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#fc8f61ff',
  },
  notificationsText: {
    fontSize: 14,
  },
  notificationsTextDiv: {
    paddingVertical: 10,
    width: '100%',
  },
  notificationsDate: {
    fontSize: 12,
    color: '#807f7fff',
  },
  notificationsDate2: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  notificationsDateDiv: {
    paddingVertical: 5,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row'
  },
  tabDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: '#fff',
  },
  notificationsDiv: {
    maxWidth: screenWidth,
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: '#fff',
    flexGrow: 1,
    padding: 10,
  },
  emptyNotifications: {
    padding: 15,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotificationsText: {
    color: '#807f7fff',
    fontSize: 11,
    marginLeft: 5,
  },
});
export const CheckoutPageStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee' },
  itemContainer: {
    flexDirection: 'row',
    marginVertical: 7,
    padding: 10,
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 10,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginBottom: 5,
  },
  imageDiv: {
    width: 100,
    alignItems: 'center',
  },
  details: { flex: 1, padding: 10 },
  name: { fontWeight: '700', fontSize: 15, color: '#222', marginBottom: 5 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 18 },
  footer: {
    backgroundColor: '#fff',
    padding: 10,
    width: '100%',
    alignItems: 'center',
  },

  categoryContainer: {
    width: '100%',
    padding: 7,
  },
  categoryText: { color: '#585858ff', fontSize: 12, fontWeight: '700' },
  fileInfoDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    padding: 7,
  },
  fileInfoText: {
    color: '#484848ff',
    fontSize: 13,
  },
  marginRight: {
    marginRight: 5,
  },
  sizeContainer: {
    padding: 7,
    width: '100%',
    justifyContent: 'flex-start',
  },
  sizeContainer2: {
    padding: 7,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
  },
  priceText: {
    fontWeight: '700',
    marginLeft: 5,
    color: PRIMARY_COLOR,
    fontSize: 13,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
  },
  payText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
export const ProfileComponentStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  name: {
    fontSize: 21,
    fontWeight: '700',
    width: '79%',
  },
  pointsBal: {
    color: PRIMARY_COLOR,
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 7,
  },
  progressBar: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: '20%',
    height: 6,
    backgroundColor: '#222',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 3,
  },
  text: {
    fontSize: 14,
    color: '#222',
  },
  textColored: {
    paddingTop: 3,
    fontSize: 14,
    color: PRIMARY_COLOR,
  },
  textRight: {
    fontSize: 14,
    color: '#222',
    marginLeft: 6,
  },
  swiper: {
    width: '100%',
    height: 350,
  },
  imageDiv: {
    width: '100%',
    position: 'relative',
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    position: 'absolute',
    bottom: -25,
    right: 10,
    padding: 15,
    borderRadius: 20,
    zIndex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalImage2: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 7,
  },
  modalButtons2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  nameBoxb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 5,
    padding: 13,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  nameBox2: {
    alignItems: 'flex-start',
    marginVertical: 5,
    padding: 13,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  courseBox: {
    alignItems: 'flex-start',
    marginVertical: 5,
    padding: 13,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  nameBox3: {
    alignItems: 'flex-start',
    marginVertical: 5,
    padding: 13,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: PRIMARY_COLOR,
  },
  rowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '45%',
  },
  rowBox2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingBottom: 5,
  },
  rowBox2c: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowBox2b: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    paddingBottom: 5,
  },
  rowBox2a: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 5,
  },
  rowBox3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '70%',
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  baseText: {
  flexDirection: 'row',
  alignItems: 'flex-end',
},
largeText: {
  fontSize: 32,
  fontWeight: 'bold',
  color: PRIMARY_COLOR,
},
smallText: {
  fontSize: 18,
  color: PRIMARY_COLOR,
},
largeTextWhite: {
  fontSize: 32,
  fontWeight: 'bold',
  color: '#fff',
},
smallTextWhite: {
  fontSize: 18,
  color: '#fff',
},
icon: {
  paddingTop: 5,
  alignSelf: 'center',
  marginRight: 4,
},
  equalDiv: {
    width: '25%',
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    paddingTop: 5,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMargin2: {
    marginLeft: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#fff',
    padding: 10,
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  topBarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  sectionTitle: {
    padding: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    width: '100%',
    borderBottomWidth: 0.5,
    borderBottomColor: '#fc8f61ff',
  },
  courseCardDiv: {
    padding: 7,
    minWidth: '100%',
    alignItems: 'center'
  },
  courseCard: {
    width: 90,
    height: 90,
    backgroundColor: '#eee',
    margin: 6,
    borderRadius: 10,
    padding: 7,
    borderWidth: 0.5,
    borderColor: '#fc8f61ff'
  },
  emptyTextDiv: {
    width: '100%',
    alignItems: 'flex-start',
    padding: 10,
  },
  uploadButton: {
    padding: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  emptyText: {
    color: '#807f7fff',
    fontSize: 13
  },
  uploadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  courseDetailMain: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    width: '100%',
    textAlign: 'center'
  },
  courseDetail2: {
    marginTop: 4,
    fontSize: 12,
    color: '#222',
    width: '100%',
    textAlign: 'center'
  },
  courseDetail3: {
    paddingVertical: 4,
    fontSize: 11,
    width: '100%',
    textAlign: 'center',
    color: '#5f5d5dff'
  }
});
export const NotificationDetailsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee', maxWidth: '100%' },
  content: { 
    padding: 15,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 7,
    justifyContent: 'flex-start'
 },
  title: { fontSize: 20, fontWeight: 'bold' },
  message: { marginBottom: 10, color: '#2222', fontSize: 14 },
  message1: { paddingVertical: 10, color: '#2222', fontWeight: '700', alignSelf: 'center', fontSize: 17 },
  securityWarningBox: {
      marginTop: 6,
      padding: 15,
      backgroundColor: '#fff5f5',
      borderRadius: 8,
      borderWidth: 0.8,
      borderColor: PRIMARY_COLOR_TINT,
    },
    securityWarningText: {
      flex: 1,
      fontSize: 13,
      color: PRIMARY_COLOR_TINT,
      lineHeight: 18,
    },
    date:{
      color: '#888',
      alignSelf: 'flex-end',
      marginVertical: 7
    }
});
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    width: '70%',
    height: '100%',
    backgroundColor: '#fff',
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 10,
    paddingHorizontal: 13,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: .8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
  },
  largeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  userSubtext: {
    fontSize: 13,
    color: '#2222',
    marginTop: 3,
  },
separator: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    marginVertical: 10,
    width: '100%',
  },
  userHandle: {
    color: PRIMARY_COLOR,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
  },
})



