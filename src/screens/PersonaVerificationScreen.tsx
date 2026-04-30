import Persona from 'react-native-persona';

const handleStartVerification = async () => {
  // 1. Get the inquiryId from your backend
  const { inquiryId } = await fetchInquiryFromBackend();

  // 2. Launch the Persona UI
  Persona.Inquiry.fromInquiry(inquiryId)
    .onComplete((inquiryId, status, fields) => {
      // User finished the flow
      if (status === 'completed') {
        // Refresh user data or show success toast
      }
    })
    .onCanceled(() => {
       console.log('User exited verification');
    })
    .onError((error) => {
       console.error('Persona Error:', error);
    })
    .build()
    .start();
};