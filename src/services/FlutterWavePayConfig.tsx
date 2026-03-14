import { PayWithFlutterwave } from 'flutterwave-react-native';

export const CoursePurchaseButton = ({ course, user }) => {
  const handleOnRedirect = (data) => {
    if (data.status === 'successful') {
      // 1. Call your backend to enroll the user in the course
      // 2. Update Redux state
      console.log("Payment Successful!", data.transaction_id);
    } else {
      // Handle cancellation/failure
    }
  };

  return (
    <PayWithFlutterwave
      onRedirect={handleOnRedirect}
      options={{
        tx_ref: `tx-${course.id}-${Date.now()}`,
        authorization: 'FLWPUBK_TEST-XXXXXXXXXXXXXXX', // Your Public Key
        customer: {
          email: user.email,
          name: user.name,
        },
        amount: course.price,
        currency: 'NGN',
        payment_options: 'card, ussd, banktransfer',
      }}
      customButton={(props) => (
        <TouchableOpacity 
          style={styles.purchaseBtn} 
          onPress={props.onPress}
        >
          <Text style={styles.btnText}>Buy for ₦{course.price}</Text>
        </TouchableOpacity>
      )}
    />
  );
};