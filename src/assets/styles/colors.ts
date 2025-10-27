import { StyleSheet, Dimensions } from 'react-native';

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
  topHeader2: {
    backgroundColor: 'inherit',
    padding: 5,
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
  welcomeText2: {
    fontSize: 19,
    fontWeight: 800,
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderColor: '#f54b02', // Your preferred border color
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000',
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
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeTab: {
  borderBottomWidth: 2,
  borderBottomColor: '#FF6B6B',
  backgroundColor: '#fff',
},
badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f54b02',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 12 },
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
    paddingHorizontal: 10,
    width: '100%',
    flex: 1,
    marginVertical: 15,
    height: '100%',
    paddingBottom: 30
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
  activityIcons3: {
    padding: 8,
  },
  activityIcons2: {
    borderRadius: '50%',
    backgroundColor: '#fff',
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
    color: '#000',
  },
  searchInput: {
    padding: 10,
    backgroundColor: 'inherit',
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    width: '82%',
    borderColor: '#838181ff',
    color: '#000',
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
  popupBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '90%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupRight: {
    top: 0,
    right: 0,
    width: '85%',
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
    shadowColor: '#000',
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
  borderColor: '#f54b02', // bright orange
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
  backgroundColor: '#f54b02',
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
    borderBottomWidth: 1,
    borderColor: '#a6a5a5ff',
    paddingVertical: 8,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    color: '#000',
    fontWeight: '700',
    paddingVertical: 4,
    maxWidth: '80%',
  },
  eventDescription2: {
    color: '#000',
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
    backgroundColor: '#f54b02',
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
    color: '#000',
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
    backgroundColor: '#f54b02'
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
    color: '#000'
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
    color: '#f54b02',
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
  width: '70%',
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
    backgroundColor: '#f54b02',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: "#000"
  },
  totalPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkoutBtn: {
    width: '100%',
    backgroundColor: "#f54b02",
    padding: 20,
    borderRadius: 10,
  },
  checkoutText: {
    color: '#eee',
    fontWeight: '700',
    alignSelf: 'center',
    fontSize: 18,
  },
  totalPriceSign: {
    marginRight: 3
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: '700'
  }
});

export const WelcomeScreenStyles = StyleSheet.create({
  container: {
    flex: 1, // or any color you want
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f54b02',
  },
  gif: {
    width: '100%',
    height: '100%',
  },
});

export const SignupScreenStyles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    flex: 1,
  },
  bkg3: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    width: '93%',
    minHeight: '60%',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    position: 'relative',
  },
  activeTabText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#f54b02',
  },
  disabledBtn: {
    backgroundColor: '#222',
    opacity: 0.6,
  },
  tabButton: {
    padding: 5,
    color: '#000',
  },
  header: {
    fontSize: 20,
    color: '#000',
  },
  headerBtnsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 5,
    padding: 8,
    top: 0,
  },
  inputContainer: {
    fontSize: 17,
    padding: 10,
    color: '#000',
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  inputHeader: {
    fontSize: 14,
    marginBottom: 10,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    minWidth: '100%',
    borderColor: '#000',
    color: '#000',
    marginBottom: 8,
    fontSize: 14,
  },
  input2: {
    padding: 10,
    minWidth: '85%',
    color: '#000',
  },
  validationText: {
    fontSize: 13,
    color: '#fd1515ff',
    fontWeight: 800,
  },
  inputKAVContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  passwordContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  passwordInput: {
    flex: 1,
    color: '#000',
    width: '100%',
  },
  passwordInputWrapper: {
    borderWidth: 1,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
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
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f54b02',
  },
  selector: {
    padding: 15,
    backgroundColor: 'inherit',
    borderWidth: 1,
    width: '90%',
    borderColor: '#000',
    color: '#fff',
  },
  selectorHeader: {
    color: '#fff',
  },
  passwordIcons: {
    marginRight: 9,
  },
  selectorHeader2: {
    color: '#000',
  },
  termsParagraph: {
    marginBottom: 10,
    fontSize: 17,
  },
  forgotPassParagraph: {
    fontSize: 14,
    color: '#000',
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
    borderColor: '#000',
  },
});

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eee',
    justifyContent: 'space-between',
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#eee',
  },
  iconItem: {
    alignItems: 'center',
  },
  activeIconLabel: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  iconLabel: {
    marginTop: 5,
    fontSize: 11,
    color: '#032820',
  },
  header: {
    marginTop: 5,
    fontSize: 35,
    fontWeight: 700,
    color: '#000',
  },
});

export const EmailVerifyScreenStyles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    width: '90%',
    height: '55%',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    position: 'relative',
  },
  infoText: {
    fontSize: 20,
    color: '#000',
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
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 17,
    color: '#f54b02',
    marginLeft: 8,
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
    color: '#f54b02',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#000',
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
    color: '#000'
  },
  input: {
    width: '100%',
    padding: 7,
    borderWidth: 1,
    borderColor: '#787777ff',
    color: '#000'
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
    backgroundColor: '#f54b02',
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
    color: '#000',
  },
  errorToastDiv: {
    borderLeftColor: '#f12c1eff', 
    backgroundColor: '#fff'
  },
  errorToastText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  }
})

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
    color: '#000',
  },
  description: {
    fontSize: 15,
    color: '#000',
    paddingVertical: 10,
  },
  price: {
    fontSize: 20,
    color: '#f54b02',
    fontWeight: '700',
    marginLeft: 2,
  },
  carouselContainer: { position: 'relative', borderRadius: 10 },
  counter: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#fff',
    color: '#f54b02',
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
    alignItems: 'center',
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
    color: '#000',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#f54b02',
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
    color: '#000',
  },
  sellerInfo: {
    flexDirection: 'row',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otherProductsPriceDivInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f54b02',
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
    height: 70,
  },
  leftFooter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightFooter: {
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    padding: 10,
    backgroundColor: '#f54b02',
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
    color: '#000',
    fontWeight: '600',
  },
  fileInfoText2: {
    fontSize: 14,
    color: '#000',
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